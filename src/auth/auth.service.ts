import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Auth0User } from './strategies/auth0.strategy';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private signToken(userId: string, email: string, auth0Id: string) {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      googleCalendarId: email,
      auth0Id,
    });
  }

  async createSession(auth0User: Auth0User) {
    try {
      let user = await this.usersService.findByAuth0Id(auth0User.sub);
      if (!user) {
        user = await this.usersService.create({
          auth0Id: auth0User.sub,
          email: auth0User.email,
          emailVerified: auth0User.email_verified,
          name: auth0User.name,
          picture: auth0User.picture,
        });
      }

      const token = await this.signToken(user.id, user.email, user.auth0Id);
      return {
        accessToken: token,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: unknown) {
      throw new NotFoundException('Could not create session for user');
    }
  }
}
