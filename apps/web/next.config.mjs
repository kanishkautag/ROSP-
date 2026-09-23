/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rosp/shared", "@rosp/db"],
  reactStrictMode: true,
};

export default nextConfig;
