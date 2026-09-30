import { BadRequestException } from '@nestjs/common';
import { describe, beforeEach, expect, it, jest } from '@jest/globals';
import { Customer } from '../src/customers/customer.entity';
import { CustomerRewardTier } from '../src/customers/customer-reward-tier.enum';
import { LoyaltySettings } from '../src/loyalty/loyalty-settings.entity';
import { LoyaltySettingsService } from '../src/loyalty/loyalty-settings.service';

describe('LoyaltySettingsService', () => {
  let service: LoyaltySettingsService;
  let settingsRepository: { findOneBy: jest.Mock; save: jest.Mock };
  let customerRepository: { find: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    settingsRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(async (settings: Partial<LoyaltySettings>) => settings),
    };
    customerRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (customers: Customer[]) => customers),
    };
    service = new LoyaltySettingsService(settingsRepository as never, customerRepository as never);
  });

  it('seeds current earning and tier defaults when settings are missing', async () => {
    settingsRepository.findOneBy.mockResolvedValue(null);

    const settings = await service.get();

    expect(settingsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        earningSpendMinor: 10000,
        earningPoints: 1,
      }),
    );
    expect(settings.tiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tier: CustomerRewardTier.GOLD, minimumPoints: 200 }),
        expect.objectContaining({ tier: CustomerRewardTier.PLATINUM, minimumPoints: 500 }),
        expect.objectContaining({ tier: CustomerRewardTier.DIAMOND, minimumPoints: 1000 }),
      ]),
    );
  });

  it('saves reward rules and recalculates customer tiers', async () => {
    const customers = [
      { rewardPoints: 250, rewardTier: CustomerRewardTier.SILVER } as Customer,
      { rewardPoints: 50, rewardTier: CustomerRewardTier.GOLD } as Customer,
    ];
    customerRepository.find.mockResolvedValue(customers);
    const tiers = [
      { tier: CustomerRewardTier.SILVER, minimumPoints: 0, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.GOLD, minimumPoints: 300, redeemPoints: 100, discountMinor: 5000 },
      {
        tier: CustomerRewardTier.PLATINUM,
        minimumPoints: 600,
        redeemPoints: 200,
        discountMinor: 10000,
      },
      {
        tier: CustomerRewardTier.DIAMOND,
        minimumPoints: 1200,
        redeemPoints: 300,
        discountMinor: 20000,
      },
    ];

    await service.update({ earningSpendMinor: 20000, earningPoints: 2, tiers });

    expect(settingsRepository.save).toHaveBeenCalledWith({
      id: 1,
      earningSpendMinor: 20000,
      earningPoints: 2,
      tiers,
    });
    expect(customers.map((customer) => customer.rewardTier)).toEqual([
      CustomerRewardTier.SILVER,
      CustomerRewardTier.SILVER,
    ]);
    expect(customerRepository.save).toHaveBeenCalledWith(customers);
  });

  it('rejects tiers with non-increasing thresholds', async () => {
    const tiers = [
      { tier: CustomerRewardTier.SILVER, minimumPoints: 0, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.GOLD, minimumPoints: 200, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.PLATINUM, minimumPoints: 200, redeemPoints: 0, discountMinor: 0 },
      { tier: CustomerRewardTier.DIAMOND, minimumPoints: 1000, redeemPoints: 0, discountMinor: 0 },
    ];

    await expect(
      service.update({ earningSpendMinor: 10000, earningPoints: 1, tiers }),
    ).rejects.toThrow(BadRequestException);
    expect(settingsRepository.save).not.toHaveBeenCalled();
  });
});
