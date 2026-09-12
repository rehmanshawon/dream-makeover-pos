import { StockMovementReason } from '../stock-movement-reason.enum';

export class StockMovementResponseDto {
  id: string;
  productId: string;
  delta: number;
  reason: StockMovementReason;
  referenceId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}
