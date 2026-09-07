/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['src']
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost']
}

export default nextConfig
