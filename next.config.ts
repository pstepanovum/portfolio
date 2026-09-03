import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  async headers() {
    // The OAuth consent screen and the dashboard must never be frameable, or a
    // page elsewhere could overlay them and coax an approval click. Applied
    // site-wide: nothing here is meant to be embedded, and our own outbound
    // YouTube embeds are unaffected (frame-ancestors governs who embeds us).
    const security = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];

    return [{ source: "/:path*", headers: security }];
  },
  async rewrites() {
    // The App Router skips dot-prefixed directories, so /.well-known routes
    // cannot be defined as folders under app/. Rewrites are the reliable path.
    // The :path* variants cover RFC 9728 resource-suffixed discovery URLs
    // (for example /.well-known/oauth-protected-resource/api/mcp).
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource/:path*",
        destination: "/api/well-known/oauth-protected-resource?resource=:path*",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server/:path*",
        destination: "/api/well-known/oauth-authorization-server",
      },
    ];
  },
};

export default nextConfig;
