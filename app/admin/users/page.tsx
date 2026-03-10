"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRole } from "../../../contexts/RoleContext";
import RoleGuard from "../../../components/RoleGuard";
import { APP_ROLES, AppRole, ROLE_LABELS, ROLE_COLORS } from "../../../lib/roles";

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  currentRole: AppRole | null;
  currentRoleId: string | null;
  saving: boolean;
  saved: boolean;
};

type RoleOption = { id: string; name: AppRole };

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function UserManagement() {
  const { schoolId } = useRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!schoolId) return;
    load(schoolId);
  }, [schoolId]);

  async function load(sid: string) {
    // Fetch available roles for this school (auto-seed if missing)
    let { data: roles } = await supabase
      .from("roles")
      .select("id, name")
      .eq("school_id", sid);

    // Auto-seed missing roles so admins don't have to run a migration manually
    if (!roles || roles.length < APP_ROLES.length) {
      const existingNames = new Set((roles ?? []).map((r: any) => r.name));
      const toInsert = APP_ROLES
        .filter(name => !existingNames.has(name))
        .map(name => ({ school_id: sid, name, description: ROLE_LABELS[name] }));

      if (toInsert.length > 0) {
        const { data: seeded } = await supabase
          .from("roles")
          .insert(toInsert)
          .select("id, name");
        roles = [...(roles ?? []), ...(seeded ?? [])];
      }
    }

    setRoleOptions((roles ?? []) as RoleOption[]);

    // Fetch users with their current role assignment
    const { data: usersData, error: usersErr } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, user_roles(role_id, roles(name))")
      .eq("school_id", sid)
      .order("last_name");

    if (usersErr) { setError(usersErr.message); setLoading(false); return; }

    const rows: UserRow[] = (usersData ?? []).map((u: any) => {
      const ur = u.user_roles?.[0];
      return {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        currentRole: (ur?.roles?.name as AppRole) ?? null,
        currentRoleId: ur?.role_id ?? null,
        saving: false,
        saved: false,
      };
    });

    setUsers(rows);
    setLoading(false);
  }

  async function handleRoleChange(userId: string, newRoleName: string) {
    const roleRecord = roleOptions.find(r => r.name === newRoleName);
    if (!roleRecord) return;

    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, saving: true, saved: false } : u)
    );

    const user = users.find(u => u.id === userId)!;

    if (user.currentRoleId) {
      // Update existing assignment
      await supabase
        .from("user_roles")
        .update({ role_id: roleRecord.id })
        .eq("user_id", userId)
        .eq("role_id", user.currentRoleId);
    } else {
      // Insert new assignment
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, role_id: roleRecord.id });
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, currentRole: newRoleName as AppRole, currentRoleId: roleRecord.id, saving: false, saved: true }
          : u
      )
    );

    // Clear "saved" indicator after 2s
    setTimeout(() => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, saved: false } : u));
    }, 2000);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading users...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-4xl mx-auto font-sans">

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Assign roles to control what each person can access.
        </p>
      </div>

      {/* Role reference card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {([
            { role: "admin",   desc: "Full access — students, tutors, billing, reports, all settings" },
            { role: "teacher", desc: "Students, service logs, and communications" },
            { role: "finance", desc: "Invoices, billing accounts, claim packets, and reports" },
            { role: "tutor",   desc: "Own session logs, invoices, and communications" },
            { role: "advisor", desc: "Students, guardians, and communications only" },
          ] as { role: AppRole; desc: string }[]).map(({ role, desc }) => (
            <div key={role} className="flex gap-2 items-start">
              <span className={cx("mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0", ROLE_COLORS[role])}>
                {ROLE_LABELS[role]}
              </span>
              <span className="text-xs text-gray-500 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* User table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">
            {users.length} User{users.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No users found for this school.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4 flex-wrap sm:flex-nowrap">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                  {[user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">
                    {user.first_name} {user.last_name}
                    {!user.first_name && !user.last_name && (
                      <span className="text-gray-400 italic">No name</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{user.email}</div>
                </div>

                {/* Current role badge */}
                {user.currentRole && (
                  <span className={cx(
                    "shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold hidden sm:inline-flex",
                    ROLE_COLORS[user.currentRole]
                  )}>
                    {ROLE_LABELS[user.currentRole]}
                  </span>
                )}

                {/* Role selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={user.currentRole ?? ""}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    disabled={user.saving}
                    className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                  >
                    <option value="" disabled>— assign role —</option>
                    {APP_ROLES.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>

                  {user.saving && (
                    <span className="text-xs text-gray-400">Saving...</span>
                  )}
                  {user.saved && (
                    <span className="text-xs text-green-600 font-semibold">Saved ✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Users with no role assigned default to Admin access during the initial rollout.
        Assign roles to restrict access.
      </p>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <UserManagement />
    </RoleGuard>
  );
}
