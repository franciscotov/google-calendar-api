import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConnectCalendarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(320)
  calendarId!: string;
}
