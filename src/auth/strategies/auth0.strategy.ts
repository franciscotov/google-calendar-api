import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export type Auth0User = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
};

export type Auth0UserProfile = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  nickname: string;
  picture: string;
  updated_at: string;
  email: string;
  email_verified: boolean;
};

export type Auth0Payload = {
  sub: string;
  iss: string;
  aud: string[];
  iat: number;
  exp: number;
  scope: string;
  azp: string;
};

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      audience: process.env.AUTH0_AUDIENCE,

      issuer: `https://${process.env.AUTH0_DOMAIN}/`,

      algorithms: ['RS256'],

      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      }),
    });
  }

  validate(payload: Auth0Payload) {
    return payload;
  }
}
