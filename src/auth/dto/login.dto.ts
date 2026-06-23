import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => {
    const normalizedValue: unknown = value;
    return typeof normalizedValue === 'string'
      ? normalizedValue.trim()
      : normalizedValue;
  })
  @IsEmail()
  @MaxLength(150)
  email!: string;
}
