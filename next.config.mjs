/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: "./tsconfig.build.json",
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
