"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type StaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  role_type: string | null;
  employment_status: string;
  email: string | null;
  photo_url: string | null;
};

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function StaffAvatar({ member }: { member: StaffMember }) {
  const name = member.first_name + member.last_name;
  const initials = ((member.first_name[0] ?? "") + (member.last_name[0] ?? "")).toUpperCase();
  const bg = avatarColor(name);

  if (member.photo_url) {
    return (
      <img
        src={member.photo_url}
        alt={initials}
        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
                 border: "2px solid #e2e8f0", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
      border: "2px solid #e2e8f0", letterSpacing: 0.5, userSelect: "none",
    }}>
      {initials}
    </div>
  );
}

export default function TeacherRoster() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;

      const { data } = await supabase
        .from("staff")
        .select("id, first_name, last_name, role_type, employment_status, email, photo_url")
        .eq("school_id", userData.school_id)
        .order("last_name", { ascending: true });

      if (data) setStaff(data as StaffMember[]);
      setLoading(false);
    }
    load();
  }, []);

  function getStatusClass(status: string) {
    if (status === "active") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700";
    if (status === "inactive") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700";
    return "px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500";
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading staff roster...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl mx-auto font-sans">
      <button onClick={() => router.push("/")} className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block">
        ← Back to Dashboard
      </button>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-400 text-sm mt-0.5">{staff.length} Staff Member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => router.push("/teachers/new")}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer border-none"
        >
          + Add
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="hidden sm:flex gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <div className="w-9 shrink-0" />
          <div className="flex-1">Name</div>
          <div className="w-40">Role</div>
          <div className="w-28">Status</div>
          <div className="w-4 shrink-0" />
        </div>

        {staff.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No staff members found. Add your first teacher to get started.
          </div>
        )}

        {staff.map(member => (
          <div
            key={member.id}
            onClick={() => router.push("/teachers/" + member.id)}
            style={{ cursor: "pointer" }}
            className="flex gap-3 items-center px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <StaffAvatar member={member} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">
                {member.first_name} {member.last_name}
              </div>
              <div className="text-xs text-gray-400 truncate">{member.email || "No email on file"}</div>
            </div>
            <div className="w-40 text-sm text-gray-500 hidden sm:block truncate">{member.role_type || "—"}</div>
            <div className="w-28 hidden sm:block">
              <span className={getStatusClass(member.employment_status)}>{member.employment_status}</span>
            </div>
            <div className="text-gray-300 text-base shrink-0">›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
