"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
  { label: "Home", path: "/", icon: "🏠" },
  { label: "Students", path: "/students", icon: "👥" },
  { label: "Tutors", path: "/tutors", icon: "🎓" }, // Changed from "Providers"
  { label: "Logs", path: "/logs/new", icon: "📝" },
];
 
  return (
    <>
      {/* Desktop Sidebar (Controlled by globals.css) */}
      <aside className="desktop-sidebar">
        <div style={{ padding: "24px", fontWeight: 800, color: "white", fontSize: "20px" }}>ESA Ops</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path} 
              style={{
                padding: "16px 24px",
                textDecoration: "none",
                color: pathname === item.path ? "white" : "#94a3b8",
                backgroundColor: pathname === item.path ? "#1e293b" : "transparent",
                fontSize: "15px",
                fontWeight: 600
              }}
            >
              <span style={{ marginRight: "12px" }}>{item.icon}</span> {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
        {/* Spacer so content doesn't get hidden behind the mobile tray */}
        <div className="mobile-spacer" style={{ height: "80px", display: "none" }} /> 
      </main>

      {/* Mobile Bottom Tray (Controlled by globals.css) */}
      <nav className="mobile-nav-tray">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path} 
            style={{
              textDecoration: "none",
              color: pathname === item.path ? "#0f172a" : "#64748b",
              textAlign: "center",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div style={{ fontSize: "20px" }}>{item.icon}</div>
            <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: pathname === item.path ? 700 : 400 }}>
              {item.label}
            </div>
          </Link>
        ))}
      </nav>
    </>
  );
}