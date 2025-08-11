import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  distDir: 'out',
  //devIndicators: false,
  webpack: (config, { isServer }) => {
    // Prevent bundling Node/Electron modules in the client build
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        electron: false,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
        os: false,
        module: false,
      };
    }
    return config;
  },
};

export default nextConfig;
