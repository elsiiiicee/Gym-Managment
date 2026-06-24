import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (.next/standalone/server.js) so the
  // Docker runtime stage can run `node server.js` without the full node_modules.
  output: "standalone",
  // We run `npm run lint` and `npm run typecheck` separately in CI/dev.
  // Don't fail production builds on lint — eslint is a devDependency
  // and may not be present in slim build environments.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
};

export default config;
