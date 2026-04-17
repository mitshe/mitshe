import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const API_URL = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  // Set turbopack root for monorepo builds (needed in Docker)
  turbopack: {
    root: process.env.TURBO_ROOT || undefined,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Proxy /api/v1/* requests to NestJS backend
        source: "/api/v1/:path*",
        destination: `${API_URL}/api/v1/:path*`,
      },
      {
        // Proxy /auth/* requests to NestJS backend
        source: "/auth/:path*",
        destination: `${API_URL}/auth/:path*`,
      },
    ];
  },
};

// Sentry configuration
const sentryConfig = {
  // Suppress source map upload warnings during development
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,

  // Don't hide source maps from browser devtools
  hideSourceMaps: false,
};

export default withSentryConfig(nextConfig, sentryConfig);
