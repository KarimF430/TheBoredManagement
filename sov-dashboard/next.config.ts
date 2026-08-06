import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Render needs standalone for Docker; Vercel uses its own format
  output: process.env.RENDER ? 'standalone' : undefined,
  serverExternalPackages: ['better-sqlite3'],


  // Compress all responses (Brotli/Gzip)
  compress: true,

  // Add response headers for API routes
  async headers() {
    // Production only. In dev this pins every chunk as immutable for a year,
    // so edited CSS/JS is served from browser cache and changes never appear —
    // it is the "Custom Cache-Control headers detected" warning Next.js prints
    // on boot, and the reason edits look like they aren't taking effect.
    if (process.env.NODE_ENV !== 'production') return []

    return [
      {
        // Cache static assets aggressively
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;
