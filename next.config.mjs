/** @type {import('next').NextConfig} */
const nextConfig = {
  // These packages use native/node-only code and must not be bundled by Next.
  serverExternalPackages: ["postgres", "@react-pdf/renderer"],
  reactStrictMode: true,
};

export default nextConfig;
