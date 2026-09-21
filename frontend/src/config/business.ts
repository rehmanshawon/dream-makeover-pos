export interface BusinessInfo {
  name: string;
  tagline: string;
  addressLines: string[];
  phone: string;
  website: string;
  email: string;
}

/**
 * Business identity shown on printed receipts and in the Settings page.
 *
 * Address lines are rendered centered on the 32-character receipt.
 * Keep each line under 32 characters to avoid truncation.
 */
export const BUSINESS_INFO: BusinessInfo = {
  name: 'DREAM MAKEOVER',
  tagline: 'A Luxury Beauty Salon',
  addressLines: [
    'Shop No: 09, Ground Floor',
    'Online Plaza, Matikata Bazar',
    'Dhaka Cantonment, Dhaka - 1206',
  ],
  phone: '01895-632484',
  website: 'https://dreammakeover.bd',
  email: 'info@dreammakeover.bd',
};
