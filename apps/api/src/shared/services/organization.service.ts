import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  private generateWebhookToken(): string {
    return `wh_${crypto.randomBytes(24).toString('hex')}`;
  }

  async getWebhookToken(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { webhookToken: true },
    });

    if (org.webhookToken) {
      return org.webhookToken;
    }

    const token = this.generateWebhookToken();
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { webhookToken: token },
    });

    return token;
  }

  async regenerateWebhookToken(organizationId: string): Promise<string> {
    const token = this.generateWebhookToken();
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { webhookToken: token },
    });
    return token;
  }

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
