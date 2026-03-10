"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Student } from "../../types";

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function StudentAvatar({ student }: { student: Student }) {
  const name = student.first_name + student.last_name;
  const initials = ((student.first_name[0] ?? "") + (student.last_name[0] ?? "")).toUpperCase();
  const bg = avatarColor(name);

  if (student.photo_url) {
    return (
      <img
        src={student.photo_url}
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

export default function StudentRoster() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;

      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", userData.school_id)
        .order("last_name", { ascending: true });

      if (data) setStudents(data as Student[]);
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
      <p className="text-gray-400 text-sm">Loading roster...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl mx-auto font-sans">
      <button onClick={() => router.push("/")} className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block">
        ← Back to Dashboard
      </button>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-400 text-sm mt-0.5">{students.length} Total Enrolled</p>
        </div>
        <button
          onClick={() => router.push("/students/new")}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer border-none"
        >
          + Add
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="hidden sm:flex gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <div className="w-9 shrink-0" />
          <div className="flex-1">Student Name</div>
          <div className="w-24">Grade</div>
          <div className="w-24">Status</div>
          <div className="w-4 shrink-0" />
        </div>

        {students.map(student => (
          <div
            key={student.id}
            onClick={() => router.push("/students/" + student.id)}
            style={{ cursor: "pointer" }}
            className="flex gap-3 items-center px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
          >
            <StudentAvatar student={student} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">
                {student.preferred_name
                  ? `${student.preferred_name} ${student.last_name}`
                  : `${student.first_name} ${student.last_name}`}
              </div>
              <div className="text-xs text-gray-400 truncate">{student.guardian_email || "No email on file"}</div>
            </div>
            <div className="w-24 text-sm text-gray-500 hidden sm:block">{student.grade_level || "N/A"}</div>
            <div className="w-24 hidden sm:block">
              <span className={getStatusClass(student.status)}>{student.status}</span>
            </div>
            <div className="text-gray-300 text-base shrink-0">›</div>
          </div>
        ))}
      </div>
    </div>
  );
}