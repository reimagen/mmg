import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3", "ws"],
  // client/* (mentra, browser) lives beside web/, so the bundler root is the repo.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
