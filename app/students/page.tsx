"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Student } from "../../types";

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
          <div className="flex-1">Student Name</div>
          <div className="w-24">Grade</div>
          <div className="w-24">Status</div>
          <div className="w-16 text-right">Action</div>
        </div>

        {students.map(student => (
          <div key={student.id} className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{student.first_name} {student.last_name}</div>
              <div className="text-xs text-gray-400 truncate">{student.guardian_email || "No email on file"}</div>
            </div>
            <div className="w-24 text-sm text-gray-500">{student.grade_level || "N/A"}</div>
            <div className="w-24">
              <span className={getStatusClass(student.status)}>{student.status}</span>
            </div>
            <div className="w-16 text-right">
              <button
                onClick={() => router.push("/students/" + student.id)}
                className="text-blue-500 text-sm font-semibold hover:text-blue-700 bg-transparent border-none cursor-pointer p-0"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}