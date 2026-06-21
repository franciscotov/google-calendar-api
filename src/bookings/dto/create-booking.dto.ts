import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
