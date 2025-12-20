import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // Если user undefined - выбрасываем 401 (не 500)
    // Это может произойти, если guard не установил user в request
    if (!user) {
      throw new UnauthorizedException('User not found in request. Authentication required.');
    }
    
    return user;
  },
);

