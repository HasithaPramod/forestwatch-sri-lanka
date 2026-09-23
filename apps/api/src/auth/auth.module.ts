import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { RolesGuard } from './roles.guard';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, RateLimitGuard],
  exports: [AuthService, TokenService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
