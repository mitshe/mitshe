import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { ClerkAuthStrategy } from './strategies/clerk.strategy';
import { ApiKeyAuthStrategy } from './strategies/api-key.strategy';
import { LocalAuthStrategy } from './strategies/local.strategy';
import { JwtAuthStrategy } from './strategies/jwt.strategy';
import { SharedModule } from '../shared.module';
import { ApiKeysModule } from '@/modules/api-keys/api-keys.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    SharedModule, // For PrismaService
    forwardRef(() => ApiKeysModule), // For ApiKeysService
  ],
  providers: [
    LocalAuthStrategy,
    ClerkAuthStrategy,
    ApiKeyAuthStrategy,
    JwtAuthStrategy,
    AuthGuard,
  ],
  exports: [
    LocalAuthStrategy,
    ClerkAuthStrategy,
    ApiKeyAuthStrategy,
    JwtAuthStrategy,
    AuthGuard,
  ],
})
export class AuthModule {}
