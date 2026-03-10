/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  env: {
    FMP_API_KEY: process.env.FMP_API_KEY
  }
}

module.exports = nextConfig
