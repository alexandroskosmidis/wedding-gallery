import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [
    "172.20.10.3",
    "192.168.1.197",
    "192.168.137.1",
    "192.168.1.165",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/wedding-gallery-5181c.firebasestorage.app/o/**",
      },
      {
        protocol: "https",
        hostname: "choashaysnhquhukoryd.supabase.co",
        pathname: "/storage/v1/object/public/photos/**",
      },
    ],
  },
};

export default nextConfig;
