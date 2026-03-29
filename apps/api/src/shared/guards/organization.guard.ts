import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { ClerkUser } from './clerk-auth.guard';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clerkUser = request.clerkUser as ClerkUser | undefined;

    if (!clerkUser) {
      throw new BadRequestException('User not authenticated');
    }

    // Determine the clerk org ID (use personal_ prefix for users without org)
    const clerkOrgId =
      clerkUser.organizationId || `personal_${clerkUser.userId}`;

    // Check if organization exists in our database
    let org = await this.prisma.organization.findUnique({
      where: { clerkId: clerkOrgId },
    });

    // If not, create it
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          clerkId: clerkOrgId,
          name: clerkUser.organizationId
            ? `Organization`
            : `Personal Workspace`,
        },
      });
    }

    // Attach the internal organization ID to the request
    request.organizationId = org.id;

    return true;
  }
}
