"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  const navItems = [
    { label: "Home", path: "/", icon: "🏠" },
    { label: "Students", path: "/students", icon: "👥" },
    { label: "Tutors", path: "/tutors", icon: "🎓" },
    { label: "Logs", path: "/logs/new", icon: "📝" },
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Don't show any nav chrome on the login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div style={{ padding: "24px", fontWeight: 800, color: "white", fontSize: "20px" }}>
          ESA Ops
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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
                fontWeight: 600,
              }}
            >
              <span style={{ marginRight: "12px" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Sign out at bottom of sidebar */}
        <button
          onClick={handleSignOut}
          style={{
            margin: "16px",
            padding: "10px 16px",
            background: "transparent",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "left",
            width: "calc(100% - 32px)",
          }}
        >
          🚪 Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
        <div className="mobile-spacer" style={{ height: "80px", display: "none" }} />
      </main>

      {/* Mobile Bottom Tray */}
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
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "20px" }}>{item.icon}</div>
            <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: pathname === item.path ? 700 : 400 }}>
              {item.label}
            </div>
          </Link>
        ))}
        {/* Sign out in mobile tray */}
        <button
          onClick={handleSignOut}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            textAlign: "center",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <div style={{ fontSize: "20px" }}>🚪</div>
          <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: 400 }}>Sign Out</div>
        </button>
      </nav>
    </>
  );
}