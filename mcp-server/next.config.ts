import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["subocean-olevia-securely.ngrok-free.dev"],
  outputFileTracingIncludes: {
    "/*": ["./config/default.json"]
  }
};

export default nextConfig;
