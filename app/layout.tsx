import "./globals.css";
import ClientLayout from "./ClientLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* THIS FORCES THE BROWSER TO USE MOBILE DIMENSIONS */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        <title>ESA Ops</title>
      </head>
      <body style={{ margin: 0, backgroundColor: "#f8fafc" }}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}