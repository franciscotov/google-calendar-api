import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => {
    const normalizedValue: unknown = value;
    return typeof normalizedValue === 'string'
      ? normalizedValue.trim()
      : normalizedValue;
  })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsOptional()
  @Transform(({ value }) => {
    const normalizedValue: unknown = value;
    return typeof normalizedValue === 'string'
      ? normalizedValue.trim()
      : normalizedValue;
  })
  @IsString()
  @MaxLength(150)
  name?: string;
}
