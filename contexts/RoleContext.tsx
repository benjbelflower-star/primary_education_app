"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { AppRole, DEFAULT_ROLE, canAccess } from "../lib/roles";

type RoleContextValue = {
  role: AppRole | null;
  schoolId: string | null;
  loading: boolean;
  /** Convenience: true when role is loaded and equals 'admin' */
  isAdmin: boolean;
  /** Returns true if the current role can visit the given path */
  can: (path: string) => boolean;
};

export const RoleContext = createContext<RoleContextValue>({
  role: null,
  schoolId: null,
  loading: true,
  isAdmin: false,
  can: () => true,
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Run both queries in parallel
      const [userData, userRoleData] = await Promise.all([
        supabase.from("users").select("school_id").eq("id", user.id).single(),
        supabase.from("user_roles").select("roles(name)").eq("user_id", user.id).maybeSingle(),
      ]);

      if (userData.data?.school_id) setSchoolId(userData.data.school_id);

      const roleName = (userRoleData.data as any)?.roles?.name as AppRole | undefined;
      setRole(roleName ?? DEFAULT_ROLE);
      setLoading(false);
    }

    fetchRole();

    // Re-fetch if the auth session changes (sign-in / sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      fetchRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const can = (path: string) => (role ? canAccess(role, path) : true);

  return (
    <RoleContext.Provider value={{ role, schoolId, loading, isAdmin: role === "admin", can }}>
      {children}
    </RoleContext.Provider>
  );
}
