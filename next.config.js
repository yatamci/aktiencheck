/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Don't fail build on lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors won't fail build (we still get warnings)
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
    ],
  },
  experimental: {
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 1,
  },
}

module.exports = nextConfig
