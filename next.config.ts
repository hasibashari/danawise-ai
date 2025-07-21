import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimasi untuk performa
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['recharts', 'lucide-react', 'date-fns'],
  },
  
  // Compress responses
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle analyzer (uncomment untuk debug)
  // webpack: (config, { dev, isServer }) => {
  //   if (!dev && !isServer) {
  //     config.optimization.splitChunks.chunks = 'all';
  //   }
  //   return config;
  // },
};

export default nextConfig;
