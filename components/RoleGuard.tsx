"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "../contexts/RoleContext";
import { AppRole, ROLE_LABELS } from "../lib/roles";

type Props = {
  allowedRoles: AppRole[];
  children: React.ReactNode;
  /** Where to redirect unauthorized users. Defaults to "/" */
  redirectTo?: string;
};

/**
 * Wraps a page (or section) and renders children only when the current
 * user's role is in allowedRoles.  While the role is loading it renders
 * nothing. If unauthorized it redirects and shows a brief message.
 *
 * Usage:
 *   <RoleGuard allowedRoles={["admin", "finance"]}>
 *     <PageContent />
 *   </RoleGuard>
 */
export default function RoleGuard({ allowedRoles, children, redirectTo = "/" }: Props) {
  const { role, loading } = useRole();
  const router = useRouter();

  const allowed = !loading && role !== null && allowedRoles.includes(role);
  const denied  = !loading && (!role || !allowedRoles.includes(role));

  useEffect(() => {
    if (denied) router.replace(redirectTo);
  }, [denied, redirectTo, router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Checking access...</p>
    </div>
  );

  if (denied) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-4">
      <div className="text-4xl">🔒</div>
      <h2 className="text-lg font-bold text-gray-800">Access Restricted</h2>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        Your role ({role ? ROLE_LABELS[role] : "Unknown"}) doesn't have
        permission to view this page. Contact your administrator.
      </p>
      <button
        onClick={() => router.push("/")}
        className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 cursor-pointer border-none"
      >
        Back to Dashboard
      </button>
    </div>
  );

  return allowed ? <>{children}</> : null;
}
