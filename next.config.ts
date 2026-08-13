import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["172.20.10.3", "192.168.1.197"],
};

export default nextConfig;
