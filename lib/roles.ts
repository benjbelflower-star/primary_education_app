/**
 * Role definitions and access control configuration.
 *
 * Five personas:
 *   admin   — Full access to everything
 *   teacher — Students, logging sessions, communications
 *   finance — Invoices, billing, claims, reports
 *   tutor   — Own logs and invoices, communications
 *   advisor — Students and communications (counselor / ESA coordinator)
 *
 * Users with no role assigned default to admin during the initial rollout
 * so existing accounts aren't locked out. Set roles via /admin/users.
 */

export const APP_ROLES = ["admin", "teacher", "finance", "tutor", "advisor"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Fallback when a user has no role row yet — change to "advisor" once roles are assigned */
export const DEFAULT_ROLE: AppRole = "admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin:   "Admin",
  teacher: "Teacher",
  finance: "Finance",
  tutor:   "Tutor",
  advisor: "Advisor",
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin:   "bg-red-100 text-red-700",
  teacher: "bg-blue-100 text-blue-700",
  finance: "bg-emerald-100 text-emerald-700",
  tutor:   "bg-purple-100 text-purple-700",
  advisor: "bg-teal-100 text-teal-700",
};

// ─── Nav items ────────────────────────────────────────────────────────────────

export type NavItem = {
  label: string;
  path: string;
  icon: string;
  roles: AppRole[];
};

// Items are ordered so the first 4 visible to each role become the mobile tray.
// Roles and their tray-4:
//   admin   → Home, Students, Logs, Messages  (Alerts, Invoices… in More)
//   teacher → Home, Students, Logs, Messages  (Alerts in More)
//   finance → Home, Messages, Alerts, Invoices (Claims, Reports in More)
//   tutor   → Home, Logs, Messages, Alerts    (all fit, no More needed)
//   advisor → Home, Students, Messages, Alerts (all fit, no More needed)
export const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Home",     path: "/",              icon: "🏠", roles: ["admin","teacher","finance","tutor","advisor"] },
  { label: "Students", path: "/students",      icon: "👥", roles: ["admin","teacher","advisor"] },
  { label: "Logs",     path: "/logs/new",      icon: "📝", roles: ["admin","teacher","tutor"] },
  { label: "Messages", path: "/messages",      icon: "💬", roles: ["admin","teacher","finance","tutor","advisor"] },
  { label: "Alerts",   path: "/notifications", icon: "🔔", roles: ["admin","teacher","finance","tutor","advisor"] },
  { label: "Invoices", path: "/invoices/new",  icon: "🧾", roles: ["admin","finance","tutor"] },
  { label: "Claims",   path: "/claims/new",    icon: "📦", roles: ["admin","finance"] },
  { label: "Reports",  path: "/reports",                  icon: "📊", roles: ["admin","finance"] },
  { label: "Tutors",   path: "/tutors",        icon: "🎓", roles: ["admin"] },
  { label: "Users",    path: "/admin/users",   icon: "⚙️", roles: ["admin"] },
];

// ─── Page-level access ────────────────────────────────────────────────────────
// Matched by prefix (longest match wins). Unlisted paths are open to all roles.

export const PAGE_ACCESS: { path: string; roles: AppRole[] }[] = [
  { path: "/admin",         roles: ["admin"] },
  { path: "/tutors",        roles: ["admin"] },
  { path: "/billing",       roles: ["admin","finance"] },
  { path: "/claims",        roles: ["admin","finance"] },
  { path: "/invoices",      roles: ["admin","finance","tutor"] },
  { path: "/students",      roles: ["admin","teacher","advisor"] },
  { path: "/logs",          roles: ["admin","teacher","tutor"] },
  { path: "/reports",       roles: ["admin","finance"] },
  { path: "/packets",       roles: ["admin","finance"] },
];

/** Returns true if the given role is allowed to visit the given path. */
export function canAccess(role: AppRole, path: string): boolean {
  const match = PAGE_ACCESS
    .filter(rule => path.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match ? match.roles.includes(role) : true;
}

/** Which roles can see a given nav item (used in ClientLayout). */
export function navForRole(role: AppRole): NavItem[] {
  return ALL_NAV_ITEMS.filter(item => item.roles.includes(role));
}
