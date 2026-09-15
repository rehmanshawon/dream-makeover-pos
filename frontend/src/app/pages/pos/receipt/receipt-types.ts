export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export interface ReceiptCustomer {
  name: string;
  phone: string | null;
  tier: string;
  totalPoints: number;
}

export interface ReceiptBusiness {
  name: string;
  tagline: string;
  addressLines: string[];
  phone: string;
}

export interface ReceiptLoyalty {
  pointsEarned: number;
  totalPoints: number;
  tier: string;
}

export interface ReceiptData {
  invoiceId: string;
  createdAt: string; // ISO string
  cashier: string;
  customer: ReceiptCustomer | null;
  items: ReceiptItem[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  cashReceivedMinor: number;
  changeMinor: number;
  loyalty: ReceiptLoyalty | null;
  business: ReceiptBusiness;
}
