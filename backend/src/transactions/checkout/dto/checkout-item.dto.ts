import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';
import { TransactionItemType } from '../../transaction-item.entity';

export class CheckoutItemDto {
  @IsEnum(TransactionItemType)
  itemType: TransactionItemType;

  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
