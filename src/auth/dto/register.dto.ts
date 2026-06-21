import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
