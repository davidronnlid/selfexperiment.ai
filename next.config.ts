import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Performance optimizations - only in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Disable expensive features in development
  experimental: {
    optimizeCss: process.env.NODE_ENV === 'production',
  },

  // Simplified webpack configuration for faster development
  webpack: (config, { dev, isServer }) => {
    // Only apply optimizations in production
    if (!dev) {
      // Optimize bundle size only in production
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            priority: 20,
            reuseExistingChunk: true,
          },
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Compression only in production
  compress: process.env.NODE_ENV === 'production',
  
  // Static generation for better performance
  generateEtags: false,
  
  // Headers for caching - only in production
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
          ],
        },
        {
          source: '/api/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=60, stale-while-revalidate=300',
            },
          ],
        },
      ];
    }
    return [];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
