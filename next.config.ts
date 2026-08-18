import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent browsers from MIME-sniffing a response away from the declared content-type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Disallow embedding in iframes (clickjacking protection)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Reduce referrer leakage to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 2 years, include subdomains (applied by browsers once seen)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Disable access to camera, mic, geolocation, etc. that the site doesn't use
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
