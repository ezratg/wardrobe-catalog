import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Native / large server-only packages: load them from node_modules at runtime
  // instead of bundling them.
  serverExternalPackages: [
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "better-sqlite3",
    "sharp",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
