import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption/encryption.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { OrganizationGuard } from './guards/organization.guard';
import { OrganizationService } from './services/organization.service';

@Global()
@Module({
  providers: [
    EncryptionService,
    ClerkAuthGuard,
    OrganizationGuard,
    OrganizationService,
  ],
  exports: [
    EncryptionService,
    ClerkAuthGuard,
    OrganizationGuard,
    OrganizationService,
  ],
})
export class SharedModule {}
