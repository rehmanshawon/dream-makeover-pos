import { useEffect, useState, type JSX } from 'react';
import { useLoyaltySettings, useUpdateLoyaltySettings } from '../../../api/loyalty-settings-hooks';
import type { LoyaltyTierSetting } from '../../../types/loyalty';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { minorToTakaInput, parseTakaToMinor } from '../../../utils/format';
import './LoyaltySection.css';

interface TierForm {
  tier: LoyaltyTierSetting['tier'];
  minimumPoints: string;
  redeemPoints: string;
  discountTaka: string;
}

interface FormState {
  earningSpendTaka: string;
  earningPoints: string;
  tiers: TierForm[];
}

const formFromSettings = (settings: {
  earningSpendMinor: number;
  earningPoints: number;
  tiers: LoyaltyTierSetting[];
}): FormState => ({
  earningSpendTaka: minorToTakaInput(settings.earningSpendMinor),
  earningPoints: String(settings.earningPoints),
  tiers: settings.tiers.map((tier) => ({
    tier: tier.tier,
    minimumPoints: String(tier.minimumPoints),
    redeemPoints: String(tier.redeemPoints),
    discountTaka: minorToTakaInput(tier.discountMinor),
  })),
});

export function LoyaltySection(): JSX.Element {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useLoyaltySettings();
  const updateMutation = useUpdateLoyaltySettings();
  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm(formFromSettings(data));
  }, [data]);

  const updateTier = (index: number, changes: Partial<TierForm>): void => {
    setForm((current) =>
      current
        ? {
            ...current,
            tiers: current.tiers.map((tier, tierIndex) =>
              tierIndex === index ? { ...tier, ...changes } : tier,
            ),
          }
        : current,
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!form) return;
    setSaveError(null);
    setSaved(false);
    const earningSpendMinor = parseTakaToMinor(form.earningSpendTaka);
    const earningPoints = Number(form.earningPoints);
    const tiers = form.tiers.map((tier) => ({
      tier: tier.tier,
      minimumPoints: Number(tier.minimumPoints),
      redeemPoints: Number(tier.redeemPoints),
      discountMinor: parseTakaToMinor(tier.discountTaka),
    }));

    if (
      earningSpendMinor === null ||
      earningSpendMinor < 1 ||
      !Number.isInteger(earningPoints) ||
      earningPoints < 1 ||
      tiers.some(
        (tier) =>
          !Number.isInteger(tier.minimumPoints) ||
          tier.minimumPoints < 0 ||
          !Number.isInteger(tier.redeemPoints) ||
          tier.redeemPoints < 0 ||
          tier.discountMinor === null,
      )
    ) {
      setSaveError(
        'Enter valid positive earning values, whole point amounts, and non-negative discounts.',
      );
      return;
    }

    try {
      const settings = await updateMutation.mutateAsync({
        earningSpendMinor,
        earningPoints,
        tiers: tiers.map((tier) => ({ ...tier, discountMinor: tier.discountMinor as number })),
      });
      setForm(formFromSettings(settings));
      setSaved(true);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Unable to save loyalty settings.');
    }
  };

  return (
    <Card title="Loyalty" subtitle="Points, customer tiers, and redemption rewards">
      {isLoading && <p className="loyalty-section__message">Loading loyalty settings…</p>}
      {error && (
        <p className="loyalty-section__error" role="alert">
          Unable to load loyalty settings.
        </p>
      )}
      {!isLoading && form && (
        <div className="loyalty-section">
          <div className="loyalty-section__earning">
            <label>
              Spend required for points (৳)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.earningSpendTaka}
                disabled={!isAdmin || updateMutation.isPending}
                onChange={(event) => setForm({ ...form, earningSpendTaka: event.target.value })}
              />
            </label>
            <label>
              Points earned per spend amount
              <input
                type="number"
                min="1"
                step="1"
                value={form.earningPoints}
                disabled={!isAdmin || updateMutation.isPending}
                onChange={(event) => setForm({ ...form, earningPoints: event.target.value })}
              />
            </label>
            <p>
              Points are calculated from the amount paid after discounts for products, services, and
              packages.
            </p>
          </div>

          <div className="loyalty-section__tiers">
            <div className="loyalty-section__tier-heading" aria-hidden="true">
              <span>Tier</span>
              <span>Starts at points</span>
              <span>Points to redeem</span>
              <span>Discount (৳)</span>
            </div>
            {form.tiers.map((tier, index) => (
              <div className="loyalty-section__tier-row" key={tier.tier}>
                <strong>{tier.tier}</strong>
                <label>
                  <span className="loyalty-section__mobile-label">Starts at points</span>
                  <input
                    aria-label={`${tier.tier} starts at points`}
                    type="number"
                    min="0"
                    step="1"
                    value={tier.minimumPoints}
                    disabled={!isAdmin || updateMutation.isPending}
                    onChange={(event) => updateTier(index, { minimumPoints: event.target.value })}
                  />
                </label>
                <label>
                  <span className="loyalty-section__mobile-label">Points to redeem</span>
                  <input
                    aria-label={`${tier.tier} points to redeem`}
                    type="number"
                    min="0"
                    step="1"
                    value={tier.redeemPoints}
                    disabled={!isAdmin || updateMutation.isPending}
                    onChange={(event) => updateTier(index, { redeemPoints: event.target.value })}
                  />
                </label>
                <label>
                  <span className="loyalty-section__mobile-label">Discount (৳)</span>
                  <input
                    aria-label={`${tier.tier} discount`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={tier.discountTaka}
                    disabled={!isAdmin || updateMutation.isPending}
                    onChange={(event) => updateTier(index, { discountTaka: event.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>

          <p className="loyalty-section__note">
            Set both redemption fields to zero to disable that tier’s reward. Discounts cannot
            exceed the sale total. Points are earned from the final paid amount, regardless of
            whether the cart contains products, services, or packages.
          </p>

          {!isAdmin && (
            <p className="loyalty-section__message">Only admins can change loyalty settings.</p>
          )}
          {saveError && (
            <p className="loyalty-section__error" role="alert">
              {saveError}
            </p>
          )}
          {saved && (
            <p className="loyalty-section__success" role="status">
              Loyalty settings saved.
            </p>
          )}

          {isAdmin && (
            <div className="loyalty-section__actions">
              <Button onClick={() => void handleSave()} loading={updateMutation.isPending}>
                Save loyalty settings
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
