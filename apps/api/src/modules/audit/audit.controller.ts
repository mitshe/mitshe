import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../shared/decorators/organization.decorator';
import { AuditService } from '../../shared/audit';
import { AuditAction } from '@prisma/client';

@Controller('audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getAuditLogs(
    @OrganizationId() organizationId: string,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getAuditLogs(organizationId, {
      userId,
      action,
      resourceType,
      resourceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('resource')
  async getResourceAuditTrail(
    @OrganizationId() organizationId: string,
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getResourceAuditTrail(
      organizationId,
      resourceType,
      resourceId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('user')
  async getUserActivity(
    @OrganizationId() organizationId: string,
    @Query('userId') userId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserActivity(
      organizationId,
      userId,
      days ? parseInt(days, 10) : 30,
      limit ? parseInt(limit, 10) : 100,
    );
  }
}
