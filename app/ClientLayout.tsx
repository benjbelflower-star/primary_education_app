"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { RoleProvider, useRole } from "../contexts/RoleContext";
import { navForRole, ROLE_LABELS, ROLE_COLORS, AppRole, ALL_NAV_ITEMS } from "../lib/roles";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function NavContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useRole();

  const isLoginPage = pathname === "/login";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLoginPage) return <>{children}</>;

  // While role is loading show all nav items to avoid layout flash
  const navItems = loading || !role ? ALL_NAV_ITEMS : navForRole(role as AppRole);

  // Active-state: match exact path or path prefix (for nested routes)
  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div style={{ padding: "20px 24px 12px", fontWeight: 800, color: "white", fontSize: "20px" }}>
          ESA Ops
        </div>

        {/* Role badge */}
        {role && !loading && (
          <div style={{ padding: "0 16px 16px" }}>
            <span className={cx(
              "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold",
              ROLE_COLORS[role as AppRole]
            )}>
              {ROLE_LABELS[role as AppRole]}
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              style={{
                padding: "14px 24px",
                textDecoration: "none",
                color: isActive(item.path) ? "white" : "#94a3b8",
                backgroundColor: isActive(item.path) ? "#1e293b" : "transparent",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <span style={{ marginRight: "10px" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

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
              color: isActive(item.path) ? "#0f172a" : "#64748b",
              textAlign: "center",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: "18px" }}>{item.icon}</div>
            <div style={{ fontSize: "9px", marginTop: "3px", fontWeight: isActive(item.path) ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {item.label}
            </div>
          </Link>
        ))}
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
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: "18px" }}>🚪</div>
          <div style={{ fontSize: "9px", marginTop: "3px", fontWeight: 400 }}>Sign Out</div>
        </button>
      </nav>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <NavContent>{children}</NavContent>
    </RoleProvider>
  );
}
