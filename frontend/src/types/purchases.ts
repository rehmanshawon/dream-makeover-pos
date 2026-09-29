export type PurchasePaymentMethod = 'CASH' | 'BANK' | 'MOBILE' | 'CREDIT';

export interface CreatePurchaseRequest {
  purchaseDate: string;
  supplierName?: string;
  supplierReference?: string;
  paymentMethod: PurchasePaymentMethod;
  lines: Array<{
    productId: string;
    quantity: number;
    unitCostMinor: number;
  }>;
}

export interface Purchase {
  id: string;
  purchaseDate: string;
  supplierName: string | null;
  supplierReference: string | null;
  paymentMethod: PurchasePaymentMethod;
  totalMinor: number;
  createdAt: string;
}
