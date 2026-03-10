"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { RoleProvider, useRole } from "../contexts/RoleContext";
import { navForRole, ROLE_LABELS, ROLE_COLORS, AppRole, ALL_NAV_ITEMS, NavItem } from "../lib/roles";

// Paths where a visual divider appears above the item in the desktop sidebar
const DIVIDER_BEFORE = new Set(["/messages", "/invoices/new", "/tutors"]);

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── More sheet ───────────────────────────────────────────────────────────────

function MoreSheet({
  items,
  isActive,
  onNavigate,
  onSignOut,
  onClose,
}: {
  items: NavItem[];
  isActive: (path: string) => boolean;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          backgroundColor: "white",
          borderRadius: "20px 20px 0 0",
          padding: "12px 16px 32px",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0" }} />
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingLeft: 4 }}>
          All Pages
        </p>

        {/* 3-column grid of all nav items */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {items.map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { onNavigate(item.path); onClose(); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "12px 8px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: active ? "#0f172a" : "#f8fafc",
                  color: active ? "white" : "#374151",
                }}
              >
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={() => { onSignOut(); onClose(); }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            backgroundColor: "white",
            color: "#64748b",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </>
  );
}

// ─── Main nav layout ──────────────────────────────────────────────────────────

function NavContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useRole();
  const [showMore, setShowMore] = useState(false);

  const isLoginPage = pathname === "/login";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLoginPage) return <>{children}</>;

  const navItems: NavItem[] = loading || !role ? ALL_NAV_ITEMS : navForRole(role as AppRole);

  // Mobile: first 4 items in the tray, the rest behind "More"
  const TRAY_LIMIT = 4;
  const trayItems = navItems.slice(0, TRAY_LIMIT);
  const hasMore = navItems.length > TRAY_LIMIT;

  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  // Is any "More" item currently active? If so, highlight the More button.
  const moreItemActive = hasMore && navItems.slice(TRAY_LIMIT).some(i => isActive(i.path));

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside className="desktop-sidebar">

        {/* Branding */}
        <div style={{ padding: "20px 24px 8px", fontWeight: 800, color: "white", fontSize: "20px" }}>
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

        {/* Nav links with section dividers */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
          {navItems.map((item) => (
            <div key={item.path}>
              {/* Thin divider before section-starting items */}
              {DIVIDER_BEFORE.has(item.path) && (
                <div style={{ height: 1, backgroundColor: "#1e293b", margin: "8px 0" }} />
              )}
              <Link
                href={item.path}
                style={{
                  display: "block",
                  padding: "12px 24px",
                  textDecoration: "none",
                  color: isActive(item.path) ? "white" : "#94a3b8",
                  backgroundColor: isActive(item.path) ? "#1e293b" : "transparent",
                  fontSize: "14px",
                  fontWeight: 600,
                  borderRadius: "0",
                }}
              >
                <span style={{ marginRight: "10px" }}>{item.icon}</span>
                {item.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Sign out */}
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

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="main-content">
        {children}
        <div className="mobile-spacer" style={{ height: "80px", display: "none" }} />
      </main>

      {/* ── Mobile Bottom Tray ───────────────────────────────────────── */}
      <nav className="mobile-nav-tray">
        {trayItems.map((item) => (
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
            <div style={{ fontSize: "20px" }}>{item.icon}</div>
            <div style={{
              fontSize: "10px",
              marginTop: "3px",
              fontWeight: isActive(item.path) ? 700 : 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}>
              {item.label}
            </div>
          </Link>
        ))}

        {/* More button — only shown when there are items beyond the tray limit */}
        {hasMore && (
          <button
            onClick={() => setShowMore(true)}
            style={{
              background: "none",
              border: "none",
              color: moreItemActive ? "#0f172a" : "#64748b",
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
            <div style={{ fontSize: "20px" }}>···</div>
            <div style={{ fontSize: "10px", marginTop: "3px", fontWeight: moreItemActive ? 700 : 400 }}>
              More
            </div>
          </button>
        )}

        {/* When no More button, show Sign Out in the tray instead */}
        {!hasMore && (
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
            <div style={{ fontSize: "20px" }}>🚪</div>
            <div style={{ fontSize: "10px", marginTop: "3px" }}>Sign Out</div>
          </button>
        )}
      </nav>

      {/* ── More bottom sheet ────────────────────────────────────────── */}
      {showMore && (
        <MoreSheet
          items={navItems}
          isActive={isActive}
          onNavigate={(path) => router.push(path)}
          onSignOut={handleSignOut}
          onClose={() => setShowMore(false)}
        />
      )}
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
