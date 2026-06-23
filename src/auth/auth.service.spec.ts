import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {},
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersService, jwtService);
  });

  it('register should throw when email already exists', async () => {
    usersService.findByEmail = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    });

    await expect(
      service.register({ email: 'test@example.com', name: 'Fran' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('register should create user and return access token', async () => {
    usersService.findByEmail = jest.fn().mockResolvedValue(null);
    usersService.createUser = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    });
    jwtService.signAsync = jest.fn().mockResolvedValue('jwt-token');

    await expect(
      service.register({ email: 'test@example.com', name: 'Fran' }),
    ).resolves.toEqual({ accessToken: 'jwt-token' });

    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Fran',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
    });
  });

  it('login should throw when user is not found', async () => {
    usersService.findByEmail = jest.fn().mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login should return access token for existing user', async () => {
    usersService.findByEmail = jest.fn().mockResolvedValue({
      id: 'user-2',
      email: 'ok@example.com',
    });
    jwtService.signAsync = jest.fn().mockResolvedValue('login-token');

    await expect(service.login({ email: 'ok@example.com' })).resolves.toEqual({
      accessToken: 'login-token',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-2',
      email: 'ok@example.com',
    });
  });
});