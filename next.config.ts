import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['192.168.0.5'],
  images: {
    // 90 is used for the hero portrait so it isn't visibly recompressed
    qualities: [75, 90],
  },
};

export default nextConfig;
