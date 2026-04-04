import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.17", "192.168.100.35"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname || "cjvsfyxvplfyonagekvy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  transpilePackages: ["@dollys-closet/core", "@dollys-closet/ui"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
