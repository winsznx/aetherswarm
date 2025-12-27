import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile wagmi and reown packages
  transpilePackages: [
    '@reown/appkit',
    '@reown/appkit-adapter-wagmi',
    'wagmi',
    'viem',
  ],
  // Exclude problematic server packages from bundling
  serverExternalPackages: ['pino', 'thread-stream', 'pino-pretty'],
  // Empty turbopack config to silence warning (Next.js 16+)
  turbopack: {},
  // Configure webpack to ignore problematic packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;

