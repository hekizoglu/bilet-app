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
  // Geliştirme ortamında API isteklerini backend'e proxy'le (NEXT_PUBLIC_API_URL
  // set edilmediğinde client relative /api kullanır — localhost/CORS sorunu olmaz)
  ...(process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          return [
            { source: "/api/:path*", destination: "http://localhost:5000/api/:path*" },
            { source: "/socket.io/:path*", destination: "http://localhost:5000/socket.io/:path*" },
          ];
        },
      }
    : {}),
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

