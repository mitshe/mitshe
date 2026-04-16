import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthGuard } from '@/shared/auth';
import { OrganizationId } from '../../shared/decorators/organization.decorator';
import { AuditService } from '../../shared/audit';
import { AuditAction } from '@prisma/client';
import { ApiRateLimit } from '../../shared/decorators/throttle.decorator';

class AuditLogsQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: AuditAction;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

class ResourceAuditQueryDto {
  @IsString()
  resourceType: string;

  @IsString()
  resourceId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

class UserActivityQueryDto {
  @IsString()
  userId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

@ApiTags('Audit')
@ApiBearerAuth('bearer')
@Controller('api/v1/audit')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs for organization' })
  @ApiResponse({ status: 200, description: 'List of audit log entries' })
  async getAuditLogs(
    @OrganizationId() organizationId: string,
    @Query() query: AuditLogsQueryDto,
  ) {
    return this.auditService.getAuditLogs(organizationId, {
      userId: query.userId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });
  }

  @Get('resource')
  @ApiOperation({ summary: 'Get audit trail for a specific resource' })
  @ApiResponse({ status: 200, description: 'Audit trail for a resource' })
  async getResourceAuditTrail(
    @OrganizationId() organizationId: string,
    @Query() query: ResourceAuditQueryDto,
  ) {
    return this.auditService.getResourceAuditTrail(
      organizationId,
      query.resourceType,
      query.resourceId,
      query.limit || 100,
    );
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user activity in organization' })
  @ApiResponse({ status: 200, description: 'User activity entries' })
  async getUserActivity(
    @OrganizationId() organizationId: string,
    @Query() query: UserActivityQueryDto,
  ) {
    return this.auditService.getUserActivity(
      organizationId,
      query.userId,
      query.days || 30,
      query.limit || 100,
    );
  }
}
