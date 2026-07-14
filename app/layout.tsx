import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FireCoast",
  description: "Local order & invoicing manager",
};

// This app is entirely per-request (auth, live data), so nothing is
// statically prerendered at build time — which also keeps the database
// untouched during `next build`.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
