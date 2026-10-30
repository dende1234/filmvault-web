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
  // camera=(self): the barcode scanner (components/barcode-scanner.tsx) needs it
  // on our own origin; everything else stays blocked.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

// Custom covers are served from the project's Supabase Storage (public
// "covers" bucket, custom_covers.sql).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/covers/**" }]
        : []),
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The push service worker: always fetch the latest, only for this site.
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
