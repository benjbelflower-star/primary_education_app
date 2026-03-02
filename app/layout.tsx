import Link from "next/link";
import "./globals.css"; 

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
  const sidebarStyle: React.CSSProperties = {
    width: "250px",
    backgroundColor: "#0f172a", 
    color: "#f8fafc",
    height: "100vh",
    position: "fixed",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    zIndex: 50
  };

  const mainStyle: React.CSSProperties = {
    marginLeft: "250px",
    minHeight: "100vh",
    backgroundColor: "#f1f5f9"
  };

  const navItemStyle: React.CSSProperties = {
    padding: "12px 24px",
    color: "#cbd5e1",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "15px",
    display: "block",
    transition: "background 0.2s"
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: "24px 24px 8px 24px",
    fontSize: "11px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "1px"
  };

  return (
    <html lang="en">
      <body>
        
        {/* The Sidebar (Becomes a top scrollable nav on mobile via CSS) */}
        <div style={sidebarStyle} className="desktop-sidebar no-print">
          <div style={{ padding: "0 24px 20px 24px", borderBottom: "1px solid #1e293b", minWidth: "150px" }}>
            <h2 style={{ margin: 0, fontSize: "18px", color: "white" }}>ESA Ops</h2>
          </div>

          <div style={sectionHeaderStyle} className="nav-header">Dashboard</div>
          <Link href="/" style={navItemStyle}>Command Center</Link>

          <div style={sectionHeaderStyle} className="nav-header">Roster</div>
          <Link href="/students" style={navItemStyle}>Students</Link>
          <Link href="/tutors" style={navItemStyle}>Providers</Link>

          <div style={sectionHeaderStyle} className="nav-header">Operations</div>
          <Link href="/logs/new" style={navItemStyle}>Log Service</Link>
          <Link href="/invoices/new" style={navItemStyle}>Invoices</Link>
          <Link href="/claims/new" style={navItemStyle}>Claims</Link>
        </div>

        {/* The Main Content Area */}
        <div style={mainStyle} className="main-content">
          {children}
        </div>

      </body>
    </html>
  );
}