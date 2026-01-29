import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactiver Turbopack (trop de bugs avec Socket.IO)
  turbopack: undefined,
  
  // Utiliser webpack à la place
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
      };
    }
    return config;
  },
};

export default nextConfig;
