"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

interface DashboardStats {
  activeStudents: number;
  unbilledLogs: number;
  draftPackets: number;
}

export default function CommandCenter() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    unbilledLogs: 0,
    draftPackets: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      // Get the logged-in user and their school
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("school_id, first_name")
        .eq("id", user.id)
        .single();

      if (!userData) return;

      const sid = userData.school_id;
      setSchoolId(sid);
      setFirstName(userData.first_name || "");

      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("school_id", sid)
        .eq("status", "active");

      const { data: unbilled } = await supabase
        .from("service_logs")
        .select("id")
        .eq("school_id", sid)
        .is("invoice_line_item_id", null);

      const { data: packets } = await supabase
        .from("claim_packets")
        .select("id")
        .eq("school_id", sid)
        .eq("status", "Draft");

      const { data: recent } = await supabase
        .from("service_logs")
        .select("id, service_date, hours, service_description, students (first_name, last_name)")
        .eq("school_id", sid)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        activeStudents: students?.length || 0,
        unbilledLogs: unbilled?.length || 0,
        draftPackets: packets?.length || 0,
      });

      if (recent) setRecentLogs(recent);
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-5xl mx-auto font-sans">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back{firstName ? ", " + firstName : ""}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here is your school overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Active Students
          </div>
          <div className="text-4xl font-extrabold text-gray-900 mb-3">
            {stats.activeStudents}
          </div>
          <button
            onClick={() => router.push("/students")}
            className="text-blue-500 text-sm font-semibold hover:text-blue-700 transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Manage →
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Unbilled Logs
          </div>
          <div className="text-4xl font-extrabold mb-3" style={{ color: stats.unbilledLogs > 0 ? "#f97316" : "#0f172a" }}>
            {stats.unbilledLogs}
          </div>
          <button
            onClick={() => router.push("/invoices/new")}
            className="text-blue-500 text-sm font-semibold hover:text-blue-700 transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Invoice →
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Draft Claims
          </div>
          <div className="text-4xl font-extrabold text-gray-900 mb-3">
            {stats.draftPackets}
          </div>
          <button
            onClick={() => router.push("/claims/new")}
            className="text-blue-500 text-sm font-semibold hover:text-blue-700 transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Review →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
          Quick Actions
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/logs/new")}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
          >
            📝 Log Hours
          </button>
          <button
            onClick={() => router.push("/students/new")}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
          >
            👤 Add Student
          </button>
          <button
            onClick={() => router.push("/tutors/new")}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
          >
            🎓 Add Tutor
          </button>
          <button
            onClick={() => router.push("/invoices/new")}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
          >
            🧾 New Invoice
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
          Recent Activity
        </h3>
        {recentLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">No service logs yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Student</th>
                  <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="px-2 py-2 pr-5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Hrs</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{log.service_date}</td>
                    <td className="px-2 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {log.students?.first_name} {log.students?.last_name}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-500">{log.service_description}</td>
                    <td className="px-2 py-3 pr-5 text-sm font-semibold text-gray-900 text-right">{log.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}