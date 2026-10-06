import type { NextConfig } from "next";

const apiTarget =
  process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/+$/, "").replace(/\/api$/i, "") ||
  "http://192.168.1.100:3001";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.100"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;