/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxying keeps API calls same-origin from the browser's point of
      // view, which avoids cross-site cookie (SameSite) headaches in dev.
      // In production, terminate both frontend and backend behind the same
      // reverse proxy/domain the same way (e.g. nginx location /api/).
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
