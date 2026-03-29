# Clerk Setup Guide

This guide explains how to configure Clerk for the AI Tasks platform, including roles, permissions, and billing plan integration.

## Prerequisites

1. Clerk account at [clerk.com](https://clerk.com)
2. Application created in Clerk Dashboard
3. Environment variables configured (see `.env.example`)

## Environment Variables

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Organization Roles

The platform uses Clerk Organizations with the following roles:

### Default Clerk Roles

| Role | Key | Description |
|------|-----|-------------|
| Admin | `org:admin` | Full organization management access |
| Member | `org:member` | Standard member access |

### Custom Roles (Recommended)

For more granular control, create these custom roles in Clerk Dashboard:

| Role | Key | Permissions |
|------|-----|-------------|
| Owner | `org:owner` | Full access, billing, delete org |
| Admin | `org:admin` | Manage members, settings, workflows |
| Developer | `org:developer` | Create/edit workflows, run tasks |
| Viewer | `org:viewer` | Read-only access |

### Setting Up Custom Roles

1. Go to **Clerk Dashboard** > **Organizations** > **Roles**
2. Click **Create role**
3. Add each role with the appropriate permissions

Example role configuration:

```json
{
  "roles": [
    {
      "key": "org:owner",
      "name": "Owner",
      "description": "Organization owner with full access",
      "permissions": [
        "org:billing:manage",
        "org:members:manage",
        "org:settings:manage",
        "org:workflows:manage",
        "org:tasks:manage",
        "org:integrations:manage",
        "org:api_keys:manage"
      ]
    },
    {
      "key": "org:admin",
      "name": "Admin",
      "description": "Administrator with member and workflow management",
      "permissions": [
        "org:members:manage",
        "org:settings:manage",
        "org:workflows:manage",
        "org:tasks:manage",
        "org:integrations:manage"
      ]
    },
    {
      "key": "org:developer",
      "name": "Developer",
      "description": "Can create and manage workflows and tasks",
      "permissions": [
        "org:workflows:manage",
        "org:tasks:manage",
        "org:integrations:read"
      ]
    },
    {
      "key": "org:viewer",
      "name": "Viewer",
      "description": "Read-only access to the organization",
      "permissions": [
        "org:workflows:read",
        "org:tasks:read",
        "org:integrations:read"
      ]
    }
  ]
}
```

## Billing Plans Integration

The platform supports multiple billing tiers. You can connect them to Clerk using organization metadata.

### Plan Tiers

| Plan | Monthly Price | Features |
|------|--------------|----------|
| Free | $0 | 5 workflows, 100 executions/mo |
| Pro | $29 | 25 workflows, 5,000 executions/mo |
| Business | $99 | 100 workflows, 25,000 executions/mo |
| Enterprise | Custom | Unlimited |

### Storing Plan in Organization Metadata

When a user subscribes or changes plan, update the organization metadata:

```typescript
// After successful Stripe payment
import { clerkClient } from '@clerk/nextjs/server';

await clerkClient.organizations.updateOrganizationMetadata(organizationId, {
  publicMetadata: {
    plan: 'pro', // 'free' | 'pro' | 'business' | 'enterprise'
    planStartDate: new Date().toISOString(),
    stripeCustomerId: 'cus_xxx',
    stripeSubscriptionId: 'sub_xxx',
  },
  privateMetadata: {
    billingEmail: 'billing@company.com',
  },
});
```

### Accessing Plan Information

Frontend (React):
```typescript
import { useOrganization } from '@clerk/nextjs';

function PlanInfo() {
  const { organization } = useOrganization();
  const plan = organization?.publicMetadata?.plan || 'free';

  return <div>Current Plan: {plan}</div>;
}
```

Backend (NestJS):
```typescript
// Use Clerk SDK to verify organization and get plan
const organization = await clerkClient.organizations.getOrganization({
  organizationId,
});
const plan = organization.publicMetadata?.plan || 'free';
```

### Plan Limits Configuration

Define plan limits in a shared config:

```typescript
// src/config/plans.ts
export const PLAN_LIMITS = {
  free: {
    maxWorkflows: 5,
    maxExecutionsPerMonth: 100,
    maxTeamMembers: 2,
    features: ['basic_triggers', 'email_notifications'],
  },
  pro: {
    maxWorkflows: 25,
    maxExecutionsPerMonth: 5000,
    maxTeamMembers: 10,
    features: ['all_triggers', 'slack_notifications', 'priority_support'],
  },
  business: {
    maxWorkflows: 100,
    maxExecutionsPerMonth: 25000,
    maxTeamMembers: 50,
    features: ['all_triggers', 'all_notifications', 'sso', 'audit_logs'],
  },
  enterprise: {
    maxWorkflows: -1, // unlimited
    maxExecutionsPerMonth: -1,
    maxTeamMembers: -1,
    features: ['all_triggers', 'all_notifications', 'sso', 'audit_logs', 'custom_integrations', 'dedicated_support'],
  },
} as const;
```

## Webhook Configuration

Set up Clerk webhooks to sync organization events with your backend:

1. Go to **Clerk Dashboard** > **Webhooks**
2. Create a webhook endpoint: `https://your-api.com/webhooks/clerk`
3. Select events:
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.deleted`
   - `organizationInvitation.accepted`

### Backend Webhook Handler

```typescript
// src/modules/webhooks/clerk.controller.ts
import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { Webhook } from 'svix';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const evt = wh.verify(JSON.stringify(body), {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    switch (evt.type) {
      case 'organization.created':
        await this.handleOrgCreated(evt.data);
        break;
      case 'organization.updated':
        await this.handleOrgUpdated(evt.data);
        break;
      // ... handle other events
    }
  }
}
```

## SSO Configuration (Enterprise)

For Enterprise customers, enable SSO:

1. Go to **Clerk Dashboard** > **SSO Connections**
2. Add SAML or OIDC provider
3. Configure per-organization SSO using organization metadata

## Testing

### Development Mode

Clerk provides test mode credentials. Use them for local development:

```bash
# Use test keys for development
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Test Users

Create test users for each role:
- `owner@test.com` - Organization owner
- `admin@test.com` - Admin role
- `developer@test.com` - Developer role
- `viewer@test.com` - Viewer role

## Troubleshooting

### Common Issues

1. **"Organization not found"** - Ensure the user is a member of an organization
2. **"Insufficient permissions"** - Check the user's role has required permissions
3. **"Webhook signature invalid"** - Verify CLERK_WEBHOOK_SECRET is correct

### Debug Mode

Enable Clerk debug mode in development:

```typescript
// next.config.ts
module.exports = {
  env: {
    CLERK_DEBUG: 'true',
  },
};
```
