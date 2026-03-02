import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "ESA Operations System",
  description: "Primary Education ESA Compliance and Operations",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ESA Ops",
  },
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