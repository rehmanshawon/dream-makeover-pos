import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { Transaction } from '../transaction.entity';
import { TransactionItem, TransactionItemType } from '../transaction-item.entity';
import { Product } from '../../products/product.entity';
import { SalonService } from '../../services/service.entity';
import { Customer } from '../../customers/customer.entity';
import { CheckoutRequestDto } from './dto/checkout-request.dto';
import {
  CheckoutResponseDto,
  CheckoutItemResponseDto,
  CheckoutCustomerResponseDto,
} from './dto/checkout-response.dto';
import { InvoiceNumberService } from '../invoice-number.service';
import { Package } from '../../packages/package.entity';
import { PackageItem } from '../../packages/package-item.entity';
import { InventoryService } from '../../inventory/inventory.service';
import { AccountingService } from '../../accounting/accounting.service';
import { LoyaltySettingsService } from '../../loyalty/loyalty-settings.service';
import { SalePaymentMethod } from '../sale-payment-method.enum';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly dataSource: DataSource,

    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly loyaltySettingsService: LoyaltySettingsService,
  ) {}

  async checkout(dto: CheckoutRequestDto, cashierName: string): Promise<CheckoutResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const loyaltySettings = await this.loyaltySettingsService.get();

    return await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const serviceRepo = manager.getRepository(SalonService);
      const customerRepo = manager.getRepository(Customer);
      const transactionRepo = manager.getRepository(Transaction);
      const itemRepo = manager.getRepository(TransactionItem);
      const packageRepo = manager.getRepository(Package);
      const packageItemRepo = manager.getRepository(PackageItem);

      let subtotalMinor = 0;
      const itemResponses: CheckoutItemResponseDto[] = [];
      const itemsToSave: TransactionItem[] = [];
      const pendingStockDeltas: Array<{
        productId: string;
        quantity: number;
        costItem: TransactionItem;
      }> = [];

      for (const itemDto of dto.items) {
        if (itemDto.itemType === TransactionItemType.PRODUCT) {
          const product = await productRepo.findOne({
            where: { id: itemDto.itemId },
          });
          if (!product) {
            throw new NotFoundException(`Product not found: ${itemDto.itemId}`);
          }
          if (product.stock < itemDto.quantity) {
            throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
          }

          const lineTotal = product.sellingPriceMinor * itemDto.quantity;
          subtotalMinor += lineTotal;
          const item = itemRepo.create({
            productId: product.id,
            serviceId: null,
            packageId: null,
            itemType: TransactionItemType.PRODUCT,
            itemName: product.name,
            quantity: itemDto.quantity,
            unitPriceMinor: product.sellingPriceMinor,
            totalPriceMinor: lineTotal,
            costOfGoodsSoldMinor: 0,
          });
          itemsToSave.push(item);
          pendingStockDeltas.push({
            productId: product.id,
            quantity: itemDto.quantity,
            costItem: item,
          });

          itemResponses.push({
            itemType: TransactionItemType.PRODUCT,
            itemName: product.name,
            quantity: itemDto.quantity,
            unitPriceMinor: product.sellingPriceMinor,
            totalPriceMinor: lineTotal,
          });
        } else if (itemDto.itemType === TransactionItemType.PACKAGE) {
          const pkg = await packageRepo.findOne({
            where: { id: itemDto.itemId, active: true },
          });
          if (!pkg) {
            throw new NotFoundException(`Package not found or inactive: ${itemDto.itemId}`);
          }

          const lineTotal = pkg.packagePriceMinor * itemDto.quantity;
          subtotalMinor += lineTotal;

          const item = itemRepo.create({
            productId: null,
            serviceId: null,
            packageId: pkg.id,
            itemType: TransactionItemType.PACKAGE,
            itemName: pkg.name,
            quantity: itemDto.quantity,
            unitPriceMinor: pkg.packagePriceMinor,
            totalPriceMinor: lineTotal,
            costOfGoodsSoldMinor: 0,
          });
          itemsToSave.push(item);

          const components = await packageItemRepo.find({
            where: { packageId: pkg.id },
          });

          for (const component of components) {
            if (component.productId) {
              const product = await productRepo.findOne({
                where: { id: component.productId },
              });
              if (!product) {
                throw new NotFoundException(
                  `Product inside package not found: ${component.productId}`,
                );
              }
              if (product.stock < itemDto.quantity) {
                throw new BadRequestException(
                  `Insufficient stock for ${product.name} in package ${pkg.name}`,
                );
              }
              pendingStockDeltas.push({
                productId: product.id,
                quantity: itemDto.quantity,
                costItem: item,
              });
            }
          }

          itemResponses.push({
            itemType: TransactionItemType.PACKAGE,
            itemName: pkg.name,
            quantity: itemDto.quantity,
            unitPriceMinor: pkg.packagePriceMinor,
            totalPriceMinor: lineTotal,
          });
        } else {
          const service = await serviceRepo.findOne({
            where: { id: itemDto.itemId, active: true },
          });
          if (!service) {
            throw new NotFoundException(`Service not found or inactive: ${itemDto.itemId}`);
          }

          const lineTotal = service.priceMinor * itemDto.quantity;
          subtotalMinor += lineTotal;

          const item = itemRepo.create({
            productId: null,
            serviceId: service.id,
            packageId: null,
            itemType: TransactionItemType.SERVICE,
            itemName: service.name,
            quantity: itemDto.quantity,
            unitPriceMinor: service.priceMinor,
            totalPriceMinor: lineTotal,
          });
          itemsToSave.push(item);

          itemResponses.push({
            itemType: TransactionItemType.SERVICE,
            itemName: service.name,
            quantity: itemDto.quantity,
            unitPriceMinor: service.priceMinor,
            totalPriceMinor: lineTotal,
          });
        }
      }

      if (dto.discountMinor > subtotalMinor) {
        throw new BadRequestException('Discount cannot exceed subtotal');
      }

      let rewardDiscountMinor = 0;
      let rewardPointsRedeemed = 0;
      let customer: Customer | null = null;
      if (dto.customerId) {
        customer = await customerRepo.findOne({ where: { id: dto.customerId } });
        if (!customer) throw new NotFoundException('Customer not found');
      }
      if (dto.redeemRewardPoints) {
        if (!customer) {
          throw new BadRequestException('A customer must be selected to redeem reward points');
        }
        const currentTier = this.loyaltySettingsService.tierForPoints(
          customer.rewardPoints,
          loyaltySettings.tiers,
        );
        const tierSetting = this.loyaltySettingsService.tierSetting(
          currentTier,
          loyaltySettings.tiers,
        );
        if (
          tierSetting.redeemPoints < 1 ||
          tierSetting.discountMinor < 1 ||
          customer.rewardPoints < tierSetting.redeemPoints
        ) {
          throw new BadRequestException('This customer is not eligible to redeem reward points');
        }
        if (tierSetting.discountMinor > subtotalMinor - dto.discountMinor) {
          throw new BadRequestException('Sale total is too low for this reward discount');
        }
        rewardDiscountMinor = tierSetting.discountMinor;
        rewardPointsRedeemed = tierSetting.redeemPoints;
      }

      const totalDiscountMinor = dto.discountMinor + rewardDiscountMinor;
      const vatMinor = 0;
      const totalMinor = subtotalMinor - totalDiscountMinor;
      const paymentMethod = dto.paymentMethod ?? SalePaymentMethod.CASH;
      if (paymentMethod === SalePaymentMethod.MOBILE && !dto.mobileWalletProvider) {
        throw new BadRequestException('Choose a mobile wallet provider');
      }
      if (paymentMethod !== SalePaymentMethod.MOBILE && dto.mobileWalletProvider) {
        throw new BadRequestException('A mobile wallet provider is only valid for mobile wallet payments');
      }
      if (paymentMethod === SalePaymentMethod.CASH && dto.cashReceivedMinor < totalMinor) {
        throw new BadRequestException('Insufficient cash received');
      }
      const cashReceivedMinor =
        paymentMethod === SalePaymentMethod.CASH ? dto.cashReceivedMinor : totalMinor;
      const changeMinor = paymentMethod === SalePaymentMethod.CASH ? cashReceivedMinor - totalMinor : 0;
      const paymentReference = dto.paymentReference?.trim() || null;

      const invoiceId = await this.invoiceNumberService.next();

      const transaction = transactionRepo.create({
        invoiceId,
        customerId: dto.customerId ?? null,
        subtotalMinor,
        discountMinor: totalDiscountMinor,
        rewardDiscountMinor,
        rewardPointsRedeemed,
        loyaltyPointsEarned: 0,
        vatRatePercent: 0,
        vatMinor: 0,
        totalMinor,
        cashReceivedMinor,
        changeMinor,
        paymentMethod,
        mobileWalletProvider: dto.mobileWalletProvider ?? null,
        paymentReference,
        cashier: cashierName,
      });
      const savedTransaction = await transactionRepo.save(transaction);

      for (const item of itemsToSave) {
        item.transactionId = savedTransaction.id;
        await itemRepo.save(item);
      }

      let costOfGoodsSoldMinor = 0;
      for (const sale of pendingStockDeltas) {
        const result = await this.inventoryService.applySaleMovement(manager, {
          productId: sale.productId,
          quantity: sale.quantity,
          referenceId: savedTransaction.id,
          createdBy: cashierName,
        });
        sale.costItem.costOfGoodsSoldMinor =
          (sale.costItem.costOfGoodsSoldMinor ?? 0) + result.costMinor;
        costOfGoodsSoldMinor += result.costMinor;
      }
      savedTransaction.costOfGoodsSoldMinor = costOfGoodsSoldMinor;
      await transactionRepo.save(savedTransaction);
      for (const item of itemsToSave) await itemRepo.save(item);

      await this.accountingService.createSaleEntry(manager, {
        sourceTransactionId: savedTransaction.id,
        entryDate: (savedTransaction.createdAt ?? new Date()).toISOString().slice(0, 10),
        invoiceId,
        totalMinor,
        paymentMethod,
        revenueMinor: totalMinor,
        vatMinor,
        cogsMinor: costOfGoodsSoldMinor,
        createdBy: cashierName,
      });

      let loyaltyPointsEarned = 0;
      let customerResponse: CheckoutCustomerResponseDto | null = null;

      if (customer) {
        const previousSpendMinor = customer.lifetimeSpendMinor;
        customer.lifetimeSpendMinor += totalMinor;
        loyaltyPointsEarned =
          (Math.floor(customer.lifetimeSpendMinor / loyaltySettings.earningSpendMinor) -
            Math.floor(previousSpendMinor / loyaltySettings.earningSpendMinor)) *
          loyaltySettings.earningPoints;
        customer.rewardPoints = customer.rewardPoints - rewardPointsRedeemed + loyaltyPointsEarned;
        customer.rewardTier = this.loyaltySettingsService.tierForPoints(
          customer.rewardPoints,
          loyaltySettings.tiers,
        );
        const savedCustomer = await customerRepo.save(customer);

        customerResponse = {
          id: savedCustomer.id,
          name: savedCustomer.fullName,
          phoneNumber: savedCustomer.phoneNumber,
          tier: savedCustomer.rewardTier,
          totalPointsAfterSale: savedCustomer.rewardPoints,
          lifetimeSpendMinorAfterSale: savedCustomer.lifetimeSpendMinor,
        };
      }

      savedTransaction.loyaltyPointsEarned = loyaltyPointsEarned;
      await transactionRepo.save(savedTransaction);

      return {
        transactionId: savedTransaction.id,
        invoiceId: savedTransaction.invoiceId,
        subtotalMinor,
        manualDiscountMinor: dto.discountMinor,
        rewardDiscountMinor,
        discountMinor: totalDiscountMinor,
        totalMinor,
        cashReceivedMinor,
        changeMinor,
        paymentMethod,
        mobileWalletProvider: dto.mobileWalletProvider ?? null,
        paymentReference,
        cashier: cashierName,
        items: itemResponses,
        loyaltyPointsEarned,
        rewardPointsRedeemed,
        customer: customerResponse,
      };
    });
  }
}
