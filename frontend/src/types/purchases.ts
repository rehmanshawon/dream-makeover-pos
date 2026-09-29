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

export interface ReturnablePurchaseLine {
  purchaseId: string;
  purchaseDate: string;
  supplierName: string | null;
  paymentMethod: PurchasePaymentMethod;
  purchaseLineId: string;
  productId: string;
  productName: string;
  productStock: number;
  quantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  unitCostMinor: number;
}

export interface CreateSupplierReturnRequest {
  purchaseId: string;
  returnDate: string;
  refundMethod: PurchasePaymentMethod;
  note?: string;
  lines: Array<{ purchaseLineId: string; quantity: number }>;
}

export interface SupplierReturnResult {
  id: string;
  creditMinor: number;
  inventoryValueMinor: number;
  varianceMinor: number;
}
