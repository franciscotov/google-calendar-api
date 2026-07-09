import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Auth0Guard } from '../common/guards/auth0.guard';
import * as auth0Strategy from './strategies/auth0.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  @UseGuards(Auth0Guard)
  createSession(@Req() req: auth0Strategy.Auth0User) {
    return this.authService.createSession(req);
  }
}
