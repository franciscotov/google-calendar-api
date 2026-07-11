import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoogleCalendarService } from './google-calendar.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
