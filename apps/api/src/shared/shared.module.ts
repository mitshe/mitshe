import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption/encryption.service';
import { OrganizationGuard } from './guards/organization.guard';
import { OrganizationService } from './services/organization.service';

@Global()
@Module({
  providers: [EncryptionService, OrganizationGuard, OrganizationService],
  exports: [EncryptionService, OrganizationGuard, OrganizationService],
})
export class SharedModule {}
