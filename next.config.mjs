/** @type {import('next').NextConfig} */
const nextConfig = {
  // These packages use native/node-only code and must not be bundled by Next.
  serverExternalPackages: ["better-sqlite3", "@react-pdf/renderer"],
  reactStrictMode: true,
};

export default nextConfig;
