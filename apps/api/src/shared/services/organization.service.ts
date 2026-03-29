import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a secure random webhook token
   */
  private generateWebhookToken(): string {
    return `wh_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Ensures an organization exists in the database.
   * Creates it if it doesn't exist.
   */
  async ensureExists(clerkOrgId: string, name?: string): Promise<string> {
    // Check if organization exists
    const existing = await this.prisma.organization.findUnique({
      where: { clerkId: clerkOrgId },
    });

    if (existing) {
      return existing.id;
    }

    // Create organization
    const org = await this.prisma.organization.create({
      data: {
        clerkId: clerkOrgId,
        name: name || `Organization ${clerkOrgId.substring(0, 8)}`,
      },
    });

    return org.id;
  }

  /**
   * Gets the internal organization ID from Clerk org ID.
   * Returns null if not found.
   */
  async getInternalId(clerkOrgId: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { clerkId: clerkOrgId },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  /**
   * Gets the webhook token for an organization.
   * Creates one if it doesn't exist.
   */
  async getWebhookToken(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { webhookToken: true },
    });

    if (org.webhookToken) {
      return org.webhookToken;
    }

    // Generate and save a new token
    const token = this.generateWebhookToken();
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { webhookToken: token },
    });

    return token;
  }

  /**
   * Regenerates the webhook token for an organization.
   */
  async regenerateWebhookToken(organizationId: string): Promise<string> {
    const token = this.generateWebhookToken();
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { webhookToken: token },
    });
    return token;
  }

  /**
   * Gets the organization settings including webhook info.
   */
  async getSettings(organizationId: string): Promise<{
    id: string;
    name: string;
    slug: string | null;
    webhookToken: string;
  }> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, webhookToken: true },
    });

    // Ensure webhook token exists
    const webhookToken =
      org.webhookToken || (await this.getWebhookToken(organizationId));

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      webhookToken,
    };
  }
}
