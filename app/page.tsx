"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

interface Stats {
  activeStudents: number;
  unbilledLogs: number;
  draftPackets: number;
  openThreads: number;
  unreadAlerts: number;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const QUICK_ACTIONS = [
  { icon: "📝", label: "Log Hours",      desc: "Record a tutoring session",  path: "/logs/new" },
  { icon: "🧾", label: "New Invoice",    desc: "Bill for logged sessions",    path: "/invoices/new" },
  { icon: "👤", label: "Add Student",    desc: "Enroll a new student",        path: "/students/new" },
  { icon: "🎓", label: "Add Tutor",      desc: "Register a tutor",            path: "/tutors/new" },
  { icon: "💬", label: "New Message",    desc: "Contact a tutor or guardian", path: "/messages/new" },
  { icon: "📦", label: "New Claim",      desc: "Submit an ESA packet",        path: "/claims/new" },
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [stats, setStats] = useState<Stats>({
    activeStudents: 0,
    unbilledLogs: 0,
    draftPackets: 0,
    openThreads: 0,
    unreadAlerts: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("school_id, first_name")
        .eq("id", user.id)
        .single();

      if (!userData) return;
      const sid = userData.school_id;
      setFirstName(userData.first_name || "");

      // All queries run in parallel
      const [students, unbilled, packets, threads, alerts, recent] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", sid).eq("status", "active"),
        supabase.from("service_logs").select("id", { count: "exact", head: true }).eq("school_id", sid).is("invoice_line_item_id", null),
        supabase.from("claim_packets").select("id", { count: "exact", head: true }).eq("school_id", sid).eq("status", "Draft"),
        supabase.from("message_threads").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("service_logs")
          .select("id, service_date, hours, service_description, students(first_name, last_name)")
          .eq("school_id", sid)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setStats({
        activeStudents: students.count ?? 0,
        unbilledLogs:   unbilled.count ?? 0,
        draftPackets:   packets.count ?? 0,
        openThreads:    threads.count ?? 0,
        unreadAlerts:   alerts.count ?? 0,
      });

      if (recent.data) setRecentLogs(recent.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading dashboard...</p>
    </div>
  );

  const statCards = [
    {
      label: "Active Students",
      value: stats.activeStudents,
      path: "/students",
      cta: "View roster",
      accent: "border-blue-400",
      alert: false,
    },
    {
      label: "Unbilled Logs",
      value: stats.unbilledLogs,
      path: "/invoices/new",
      cta: stats.unbilledLogs > 0 ? "Invoice now" : "Create invoice",
      accent: stats.unbilledLogs > 0 ? "border-orange-400" : "border-gray-200",
      alert: stats.unbilledLogs > 0,
    },
    {
      label: "Draft Claims",
      value: stats.draftPackets,
      path: "/claims/new",
      cta: "Review",
      accent: stats.draftPackets > 0 ? "border-amber-400" : "border-gray-200",
      alert: false,
    },
    {
      label: "Open Threads",
      value: stats.openThreads,
      path: "/messages",
      cta: "View messages",
      accent: stats.openThreads > 0 ? "border-indigo-400" : "border-gray-200",
      alert: false,
    },
    {
      label: "Unread Alerts",
      value: stats.unreadAlerts,
      path: "/notifications",
      cta: "View alerts",
      accent: stats.unreadAlerts > 0 ? "border-red-400" : "border-gray-200",
      alert: stats.unreadAlerts > 0,
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-5xl mx-auto font-sans">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            {todayLabel()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {statCards.map(card => (
          <button
            key={card.label}
            onClick={() => router.push(card.path)}
            className={
              "bg-white rounded-xl border-t-4 border border-gray-100 p-4 text-left hover:shadow-md transition-shadow cursor-pointer " +
              card.accent
            }
          >
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 leading-tight">
              {card.label}
            </div>
            <div className={
              "text-3xl font-extrabold mb-2 " +
              (card.alert ? "text-orange-500" : "text-gray-900")
            }>
              {card.value}
            </div>
            <div className="text-xs font-semibold text-blue-500">
              {card.cta} →
            </div>
          </button>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recent Activity</h2>
            <button
              onClick={() => router.push("/logs/new")}
              className="text-xs text-blue-500 font-semibold hover:text-blue-700 bg-transparent border-none cursor-pointer p-0"
            >
              + Log hours
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-gray-400 text-sm mb-2">No sessions logged yet.</p>
              <button
                onClick={() => router.push("/logs/new")}
                className="text-blue-500 text-sm font-semibold hover:text-blue-700 bg-transparent border-none cursor-pointer p-0"
              >
                Log your first session →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLogs.map((log: any) => {
                const initials = [log.students?.first_name?.[0], log.students?.last_name?.[0]]
                  .filter(Boolean).join("").toUpperCase();
                return (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {initials || "?"}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {log.students?.first_name} {log.students?.last_name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{log.service_description}</div>
                    </div>
                    {/* Right side */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                        {log.hours}h
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{log.service_date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Quick Actions</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.path}
                onClick={() => router.push(action.path)}
                className="flex flex-col items-start gap-1 p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer text-left bg-transparent"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-xs font-bold text-gray-800 leading-tight">{action.label}</span>
                <span className="text-xs text-gray-400 leading-tight">{action.desc}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
