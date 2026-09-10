import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { Transaction } from '../transaction.entity';
import { TransactionItem, TransactionItemType } from '../transaction-item.entity';
import { Product } from '../../products/product.entity';
import { SalonService } from '../../services/service.entity';
import { Customer, CustomerRewardTier } from '../../customers/customer.entity';
import { CheckoutRequestDto } from './dto/checkout-request.dto';
import { CheckoutResponseDto, CheckoutItemResponseDto } from './dto/checkout-response.dto';

@Injectable()
export class CheckoutService {
  constructor(private readonly dataSource: DataSource) {}

  async checkout(dto: CheckoutRequestDto, cashierName: string): Promise<CheckoutResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Start a database transaction
    return await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const serviceRepo = manager.getRepository(SalonService);
      const customerRepo = manager.getRepository(Customer);
      const transactionRepo = manager.getRepository(Transaction);
      const itemRepo = manager.getRepository(TransactionItem);

      let subtotalMinor = 0;
      const itemResponses: CheckoutItemResponseDto[] = [];
      const itemsToSave: TransactionItem[] = [];

      // Process each item
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

          // Decrement stock
          product.stock -= itemDto.quantity;
          await productRepo.save(product);

          const item = itemRepo.create({
            transaction: null as any, // will set later
            productId: product.id,
            serviceId: null,
            itemType: TransactionItemType.PRODUCT,
            itemName: product.name,
            quantity: itemDto.quantity,
            unitPriceMinor: product.sellingPriceMinor,
            totalPriceMinor: lineTotal,
          });
          itemsToSave.push(item);

          itemResponses.push({
            itemType: TransactionItemType.PRODUCT,
            itemName: product.name,
            quantity: itemDto.quantity,
            unitPriceMinor: product.sellingPriceMinor,
            totalPriceMinor: lineTotal,
          });
        } else {
          // SERVICE
          const service = await serviceRepo.findOne({
            where: { id: itemDto.itemId, active: true },
          });
          if (!service) {
            throw new NotFoundException(`Service not found or inactive: ${itemDto.itemId}`);
          }

          const lineTotal = service.priceMinor * itemDto.quantity;
          subtotalMinor += lineTotal;

          const item = itemRepo.create({
            transaction: null as any,
            productId: null,
            serviceId: service.id,
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

      // Validate discount
      if (dto.discountMinor > subtotalMinor) {
        throw new BadRequestException('Discount cannot exceed subtotal');
      }

      const totalMinor = subtotalMinor - dto.discountMinor;

      if (dto.cashReceivedMinor < totalMinor) {
        throw new BadRequestException('Insufficient cash received');
      }

      const changeMinor = dto.cashReceivedMinor - totalMinor;

      // Generate invoice ID (simple for now)
      const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create transaction
      const transaction = transactionRepo.create({
        invoiceId,
        customerId: dto.customerId ?? null,
        subtotalMinor,
        discountMinor: dto.discountMinor,
        totalMinor,
        cashReceivedMinor: dto.cashReceivedMinor,
        changeMinor,
        cashier: cashierName,
      });

      const savedTransaction = await transactionRepo.save(transaction);

      // Save items with transaction reference
      for (const item of itemsToSave) {
        item.transactionId = savedTransaction.id;
        await itemRepo.save(item);
      }

      // Update customer if provided
      let loyaltyPointsEarned = 0;
      let newRewardTier: CustomerRewardTier | undefined;

      if (dto.customerId) {
        const customer = await customerRepo.findOne({
          where: { id: dto.customerId },
        });
        if (!customer) {
          throw new NotFoundException('Customer not found');
        }

        // Update lifetime spend
        customer.lifetimeSpendMinor += totalMinor;

        // Calculate points earned (1 point per 100 taka = 10000 poisha)
        loyaltyPointsEarned = Math.floor(totalMinor / 10000);

        customer.rewardPoints += loyaltyPointsEarned;

        // Recalculate tier based on total points
        customer.rewardTier = this.calculateTier(customer.rewardPoints);

        await customerRepo.save(customer);

        newRewardTier = customer.rewardTier;
      }

      return {
        transactionId: savedTransaction.id,
        invoiceId: savedTransaction.invoiceId,
        subtotalMinor,
        discountMinor: dto.discountMinor,
        totalMinor,
        cashReceivedMinor: dto.cashReceivedMinor,
        changeMinor,
        items: itemResponses,
        loyaltyPointsEarned,
        ...(newRewardTier === undefined ? {} : { newRewardTier }),
      };
    });
  }

  private calculateTier(points: number): CustomerRewardTier {
    if (points >= 1000) return CustomerRewardTier.DIAMOND;
    if (points >= 500) return CustomerRewardTier.PLATINUM;
    if (points >= 200) return CustomerRewardTier.GOLD;
    return CustomerRewardTier.SILVER;
  }
}
