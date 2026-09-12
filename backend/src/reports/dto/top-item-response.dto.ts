export class TopItemDto {
  itemId: string;
  itemName: string;
  quantitySold: number;
  revenueMinor: number;
}

export class TopItemsResponseDto {
  from: string;
  to: string;
  items: TopItemDto[];
}
