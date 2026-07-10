import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Auth0User, Auth0UserProfile } from './strategies/auth0.strategy';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly http: HttpService,
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

  async getUserProfileFromAuth0(accessToken: string): Promise<Auth0User> {
    const { data } = await firstValueFrom(
      this.http.get<Auth0UserProfile>(
        `https://${process.env.AUTH0_DOMAIN}/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
    );

    const userProfile: Auth0User = {
      sub: data.sub,
      email: data.email,
      email_verified: data.email_verified,
      name: data.name,
      picture: data.picture,
    };

    return userProfile;
  }
}
