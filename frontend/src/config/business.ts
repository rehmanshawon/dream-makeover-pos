export interface BusinessInfo {
  name: string;
  tagline: string;
  addressLines: string[];
  phone: string;
}

/**
 * Business identity shown on printed receipts.
 *
 * Replace the placeholder address and phone with the salon's actual
 * information. Each address line is centered on the 32-character
 * receipt. Keep lines short to avoid truncation.
 */
export const BUSINESS_INFO: BusinessInfo = {
  name: 'DREAM MAKEOVER',
  tagline: 'A Luxury Beauty Salon',
  addressLines: [
    // TODO: Replace with the salon's actual address.
    '123 Placeholder Road',
    'Dhaka, Bangladesh',
  ],
  phone: '+880 1XXX-XXXXXX',
};
