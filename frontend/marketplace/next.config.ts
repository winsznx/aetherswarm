import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile wagmi and reown packages
  transpilePackages: [
    '@reown/appkit',
    '@reown/appkit-adapter-wagmi',
    'wagmi',
    'viem',
  ],
  // Empty turbopack config to silence warning (Next.js 16+)
  turbopack: {},
  // Configure webpack as per official Reown AppKit docs + pino browser shim
  webpack: (config) => {
    // Provide browser-compatible shim for pino
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino': require.resolve('./src/mocks/pino.ts'),
    };

    // Externalize other packages
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;


