/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/sms/api/sms',
        destination: '/api/sms',
      },
      {
        source: '/api/sms/api/admin/devices',
        destination: '/api/admin/devices',
      },
      {
        source: '/api/sms/api/:path*',
        destination: '/api/:path*',
      }
    ];
  }
};

export default nextConfig;
