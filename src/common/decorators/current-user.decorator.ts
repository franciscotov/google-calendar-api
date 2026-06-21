import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserDto } from '../dto/jwt-user.dto';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtUserDto => {
    const request = context.switchToHttp().getRequest<{ user: JwtUserDto }>();
    return request.user;
  },
);
