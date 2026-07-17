import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { HttpService } from '@nestjs/axios';

jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {},
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findByAuth0Id: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  const http = {
    post: jest.fn(),
    get: jest.fn(),
  } as unknown as HttpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersService, jwtService, http);
  });

  it('createSession should return the access token just calling findByAuth0Id if the user exists', async () => {
    const findByAuth0IdSpy = jest
      .spyOn(usersService, 'findByAuth0Id')
      .mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        auth0Id: 'auth0|user-1',
        emailVerified: true,
        name: 'Fran',
        picture: 'https://example.com/picture.jpg',
        googleCalendarId: null,
        createAt: new Date(),
        updateAt: new Date(),
      });
    const signAsyncSpy = jest
      .spyOn(jwtService, 'signAsync')
      .mockResolvedValue('jwt-token');

    await expect(
      service.createSession({
        email: 'test@example.com',
        sub: 'auth0|user-1',
        email_verified: true,
        name: 'Fran',
        picture: 'https://example.com/picture.jpg',
      }),
    ).resolves.toEqual({ accessToken: 'jwt-token' });

    expect(findByAuth0IdSpy).toHaveBeenCalledWith('auth0|user-1');
    expect(signAsyncSpy).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
      googleCalendarId: 'test@example.com',
      auth0Id: 'auth0|user-1',
    });
  });

  it('createSession should return the access token calling create if the user does not exist', async () => {
    const createSpy = jest.spyOn(usersService, 'create').mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      auth0Id: 'auth0|user-1',
      emailVerified: true,
      name: 'Fran',
      picture: 'https://example.com/picture.jpg',
      googleCalendarId: null,
      createAt: new Date(),
      updateAt: new Date(),
    });

    const findByAuth0IdSpy = jest
      .spyOn(usersService, 'findByAuth0Id')
      .mockResolvedValue(null);
    const signAsyncSpy = jest
      .spyOn(jwtService, 'signAsync')
      .mockResolvedValue('jwt-token');

    await expect(
      service.createSession({
        email: 'test@example.com',
        sub: 'auth0|user-1',
        email_verified: true,
        name: 'Fran',
        picture: 'https://example.com/picture.jpg',
      }),
    ).resolves.toEqual({ accessToken: 'jwt-token' });

    expect(findByAuth0IdSpy).toHaveBeenCalledWith('auth0|user-1');

    expect(createSpy).toHaveBeenCalledWith({
      email: 'test@example.com',
      auth0Id: 'auth0|user-1',
      emailVerified: true,
      name: 'Fran',
      picture: 'https://example.com/picture.jpg',
    });
    expect(signAsyncSpy).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
      googleCalendarId: 'test@example.com',
      auth0Id: 'auth0|user-1',
    });
  });
});
