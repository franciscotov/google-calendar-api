import { Transform } from 'class-transformer';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBookingDto {
  @Transform(({ value }) => {
    const normalizedValue: unknown = value;
    return typeof normalizedValue === 'string'
      ? normalizedValue.trim()
      : normalizedValue;
  })
  @IsString()
  @MinLength(3)
  @MaxLength(250)
  title!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
