
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wsbhtpctgxxomgihhios.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;