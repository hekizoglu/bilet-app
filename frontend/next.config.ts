import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";
import path from "path";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
};

export default withSentryConfig(withPWA(nextConfig), {
  org: "bilet-app-org",
  project: "bilet-app-frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: true,
  },
});

