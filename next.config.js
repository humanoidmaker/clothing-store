/** @type {import('next').NextConfig} */
const cdnPrefix = String(process.env.NEXT_PUBLIC_CDN_BASE_URL || '').trim().replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  assetPrefix: cdnPrefix || undefined
};

module.exports = nextConfig;
