import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'phoneNumber must contain only digits, spaces, +, -, (, )',
  })
  phoneNumber: string;
}
