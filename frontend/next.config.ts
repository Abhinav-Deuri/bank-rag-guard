import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hides the floating Next.js dev-tools badge ("N" / "1 Issue") shown by `npm run dev`. It never
  // appears in a production build. Real errors still show in the browser console and terminal.
  devIndicators: false,
  // The vendored GradientASCII background calls WEBGL_lose_context in its effect cleanup.
  // React StrictMode (development only) mounts, cleans up and re-mounts effects on the same
  // <canvas>, which leaves it with a dead WebGL context. Production builds never double-invoke
  // effects, so this only changes `npm run dev`.
  reactStrictMode: false,
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
