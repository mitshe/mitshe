import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Per-Organization Rate Limiting Guard
 *
 * Extends the default ThrottlerGuard to use organizationId as the tracking key
 * instead of IP address. This provides rate limiting per organization.
 *
 * If no organization is in context (public endpoints), falls back to IP-based limiting.
 */
@Injectable()
export class OrganizationThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(OrganizationThrottlerGuard.name);

  /**
   * Get the tracker key for rate limiting
   * Uses organizationId if available, otherwise falls back to IP
   */
  protected override getTracker(req: Request): Promise<string> {
    // Try to get organization ID from auth context
    // The auth context is set by ClerkAuthGuard/OrganizationGuard
    const auth = (req as any).auth;
    const organizationId = auth?.organizationId;

    if (organizationId) {
      // Per-organization rate limiting
      return Promise.resolve(`org:${organizationId}`);
    }

    // Fall back to IP-based rate limiting for unauthenticated requests
    // This includes webhook endpoints which have their own rate limit decorator
    return Promise.resolve(this.getIpFromRequest(req));
  }

  /**
   * Extract IP address from request
   * Handles proxied requests (X-Forwarded-For, etc.)
   */
  private getIpFromRequest(req: Request): string {
    // Check for forwarded IP (behind proxy/load balancer)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first (client IP)
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return `ip:${ips.trim()}`;
    }

    // Check for real IP header (some proxies use this)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      return `ip:${ip}`;
    }

    // Fall back to socket IP
    return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  }

  /**
   * Override to provide better error messages
   */
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = (req as any).auth;

    if (auth?.organizationId) {
      this.logger.warn(
        `Rate limit exceeded for organization ${auth.organizationId}`,
      );
      throw new ThrottlerException(
        'Organization rate limit exceeded. Please try again later.',
      );
    }

    this.logger.warn(`Rate limit exceeded for IP ${req.ip}`);
    throw new ThrottlerException(
      'Rate limit exceeded. Please try again later.',
    );
  }
}
