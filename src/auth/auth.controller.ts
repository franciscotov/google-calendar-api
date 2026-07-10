import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Auth0Guard } from '../common/guards/auth0.guard';
import { ExtractJwt } from 'passport-jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  @UseGuards(Auth0Guard)
  async createSession(@Req() req: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const user = await this.authService.getUserProfileFromAuth0(token!);
    return this.authService.createSession(user);
  }
}
