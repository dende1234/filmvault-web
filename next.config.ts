import type { NextConfig } from "next";

// Safe, low-risk security headers only — a full Content-Security-Policy is
// deliberately not included here: a too-strict CSP can silently break TMDB
// images or Radix's portal-rendered dialogs/dropdowns, and deserves its own
// testing pass after a real deploy, not a blind addition alongside this
// unrelated round of changes.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
