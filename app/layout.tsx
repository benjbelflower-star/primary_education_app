import "./globals.css";
import ClientLayout from "./ClientLayout";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ESA Operations System",
  description: "Primary Education ESA Compliance and Operations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ESA Ops",
  },
};

// THIS IS THE FIX: Forces the phone to use mobile dimensions
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#f8fafc" }}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}