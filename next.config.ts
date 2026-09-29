import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
