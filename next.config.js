/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static image optimization
  images: {
    unoptimized: true,
  },
  
  // Add this section for Netlify compatibility
  env: {
    NETLIFY: process.env.NETLIFY,
  },

  // Optional: Add asset prefix for Netlify
  assetPrefix: process.env.NETLIFY ? '/.netlify/functions/next_assets' : '',

  // Optional: Add trailing slashes configuration
  trailingSlash: false,

  // Optional: Add React strict mode
  reactStrictMode: true,
};

module.exports = nextConfig;