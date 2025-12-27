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
      // Ignore optional Solana dependencies from @coinbase/cdp-sdk to prevent build/runtime errors
      config.resolve.alias = {
        ...config.resolve.alias,
        '@solana/kit': false,
        '@solana-program/system': false,
        '@solana-program/token': false,
      };
    }

    // Server-side externals
    config.externals.push('pino-pretty', 'lokijs', 'encoding', {
      'thread-stream': 'commonjs thread-stream',
      'pino': 'commonjs pino',
    });

    return config;
  },
};

export default nextConfig;

