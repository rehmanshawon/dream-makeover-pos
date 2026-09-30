import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { CustomerRewardTier } from '../customers/customer-reward-tier.enum';
import { LoyaltySettings, LoyaltyTierSetting } from './loyalty-settings.entity';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto';

const DEFAULT_TIERS: LoyaltyTierSetting[] = [
  { tier: CustomerRewardTier.SILVER, minimumPoints: 0, redeemPoints: 0, discountMinor: 0 },
  { tier: CustomerRewardTier.GOLD, minimumPoints: 200, redeemPoints: 0, discountMinor: 0 },
  { tier: CustomerRewardTier.PLATINUM, minimumPoints: 500, redeemPoints: 0, discountMinor: 0 },
  { tier: CustomerRewardTier.DIAMOND, minimumPoints: 1000, redeemPoints: 0, discountMinor: 0 },
];

const TIER_ORDER = [
  CustomerRewardTier.SILVER,
  CustomerRewardTier.GOLD,
  CustomerRewardTier.PLATINUM,
  CustomerRewardTier.DIAMOND,
];

@Injectable()
export class LoyaltySettingsService {
  constructor(
    @InjectRepository(LoyaltySettings)
    private readonly settingsRepository: Repository<LoyaltySettings>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async get(): Promise<LoyaltySettings> {
    let settings = await this.settingsRepository.findOneBy({ id: 1 });
    if (!settings) {
      settings = await this.settingsRepository.save({
        id: 1,
        earningSpendMinor: 10000,
        earningPoints: 1,
        tiers: DEFAULT_TIERS,
      });
    }
    return settings;
  }

  async update(dto: UpdateLoyaltySettingsDto): Promise<LoyaltySettings> {
    const tiers = this.validateTiers(dto.tiers);
    const settings = await this.settingsRepository.save({
      id: 1,
      earningSpendMinor: dto.earningSpendMinor,
      earningPoints: dto.earningPoints,
      tiers,
    });

    const customers = await this.customerRepository.find();
    for (const customer of customers) {
      customer.rewardTier = this.tierForPoints(customer.rewardPoints, tiers);
    }
    if (customers.length > 0) await this.customerRepository.save(customers);

    return settings;
  }

  tierForPoints(points: number, tiers: LoyaltyTierSetting[]): CustomerRewardTier {
    const eligible = [...tiers]
      .sort((left, right) => right.minimumPoints - left.minimumPoints)
      .find((tier) => points >= tier.minimumPoints);
    return eligible?.tier ?? CustomerRewardTier.SILVER;
  }

  tierSetting(tier: CustomerRewardTier, tiers: LoyaltyTierSetting[]): LoyaltyTierSetting {
    return tiers.find((setting) => setting.tier === tier) ?? DEFAULT_TIERS[0]!;
  }

  private validateTiers(tiers: LoyaltyTierSetting[]): LoyaltyTierSetting[] {
    const ordered = [...tiers].sort(
      (left, right) => TIER_ORDER.indexOf(left.tier) - TIER_ORDER.indexOf(right.tier),
    );
    if (
      ordered.some((tier, index) => tier.tier !== TIER_ORDER[index]) ||
      ordered.some(
        (tier, index) => index > 0 && tier.minimumPoints <= ordered[index - 1]!.minimumPoints,
      )
    ) {
      throw new BadRequestException(
        'Each reward tier must be present with increasing point thresholds.',
      );
    }
    if (ordered.some((tier) => (tier.redeemPoints === 0) !== (tier.discountMinor === 0))) {
      throw new BadRequestException(
        'Set both redemption points and discount, or set both to zero.',
      );
    }
    return ordered;
  }
}
