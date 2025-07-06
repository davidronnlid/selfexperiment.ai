import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Performance optimizations
  swcMinify: true, // Use SWC for faster minification

  // Experimental features for better performance
  experimental: {
    // Faster builds - optimize package imports
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "react-icons",
    ],
  },

  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ["chart.js"],

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Development optimizations
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
      };

      // Reduce bundle analysis in dev
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    return config;
  },

  // Faster image optimization
  images: {
    unoptimized: true, // Disable image optimization in development
  },

  // TypeScript optimizations
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
