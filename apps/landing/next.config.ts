import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "../..",
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [{ type: "host", value: "app.mitshe.com" }],
          destination: "/coming-soon",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
