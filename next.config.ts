import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Bypasses Next.js image optimization — serves files directly.
    // Needed because /public/characters/ files are OneDrive symlinks
    // that the optimizer cannot read during build/dev.
    unoptimized: true,
  },
};

export default nextConfig;
