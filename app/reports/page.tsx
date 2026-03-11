"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useRole } from "../../contexts/RoleContext";
import RoleGuard from "../../components/RoleGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

type TermGpaBucket = {
  termName: string;
  startDate: string;
  avg: number;
  count: number;
};

type DashStats = {
  totalTutors: number;
  validTutors: number;
  expiredTutors: number;
  warningTutors: number;
  avgGpa: number | null;
  supportStudents: number;
  openClaims: number;
  outstandingInvoices: number;
};

// ─── GPA Trend SVG Chart ──────────────────────────────────────────────────────

function GpaTrendChart({ data }: { data: TermGpaBucket[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No term grade data yet. GPA trend will appear once grades are recorded.
      </p>
    );
  }

  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-1">
        <span className="text-4xl font-extrabold text-blue-600">{data[0].avg.toFixed(2)}</span>
        <span className="text-xs text-gray-400">{data[0].termName} · {data[0].count} student{data[0].count !== 1 ? "s" : ""}</span>
        <span className="text-xs text-gray-300 mt-2">Need at least 2 terms for a trend line.</span>
      </div>
    );
  }

  const W = 600, H = 180;
  const padL = 44, padR = 20, padT = 16, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const minGpa = Math.max(0, Math.min(...data.map(d => d.avg)) - 0.3);
  const maxGpa = Math.min(4, Math.max(...data.map(d => d.avg)) + 0.3);
  const gpaRange = maxGpa - minGpa || 1;

  const xScale = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW;
  const yScale = (gpa: number) =>
    padT + plotH - ((gpa - minGpa) / gpaRange) * plotH;

  const pts = data.map((d, i) => `${xScale(i).toFixed(1)},${yScale(d.avg).toFixed(1)}`).join(" ");
  const areaBottom = padT + plotH;
  const areaPts = `${padL},${areaBottom} ${pts} ${xScale(data.length - 1)},${areaBottom}`;

  const yLabels = [minGpa, minGpa + gpaRange * 0.5, maxGpa].map(v => Math.round(v * 10) / 10);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {yLabels.map((gpa, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={yScale(gpa)} y2={yScale(gpa)}
            stroke="#f1f5f9" strokeWidth={1} />
          <text x={padL - 6} y={yScale(gpa) + 4} textAnchor="end"
            fontSize={10} fill="#94a3b8">{gpa.toFixed(1)}</text>
        </g>
      ))}

      {/* Area fill */}
      <polygon points={areaPts} fill="url(#gpaGrad)" />

      {/* Trend line */}
      <polyline fill="none" stroke="#3b82f6" strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round" points={pts} />

      {/* Data points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xScale(i)} cy={yScale(d.avg)} r={5}
            fill="white" stroke="#3b82f6" strokeWidth={2.5} />
          {/* GPA label above dot */}
          <text x={xScale(i)} y={yScale(d.avg) - 9} textAnchor="middle"
            fontSize={10} fontWeight={600} fill="#3b82f6">{d.avg.toFixed(2)}</text>
          {/* Term label below */}
          <text x={xScale(i)} y={H - 6} textAnchor="middle"
            fontSize={9} fill="#64748b"
            style={{ maxWidth: 60 }}>{d.termName}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1",
        onClick ? "cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all" : "",
      ].join(" ")}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className={["text-3xl font-extrabold leading-none", accent ?? "text-gray-900"].join(" ")}>
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400 mt-0.5">{sub}</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function ReportsDashboardInner() {
  const router = useRouter();
  const { schoolId } = useRole();

  const [stats, setStats]     = useState<DashStats | null>(null);
  const [trend, setTrend]     = useState<TermGpaBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;

    async function load() {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [
        { data: tutorData },
        { data: gradeData },
        { data: supportData },
        { data: claimData },
        { data: invoiceData },
      ] = await Promise.all([
        supabase.from("tutors")
          .select("id, credential_expiration, is_active")
          .eq("school_id", schoolId),

        supabase.from("term_grades")
          .select("gpa_points, terms:term_id(name, start_date)")
          .eq("school_id", schoolId)
          .not("gpa_points", "is", null),

        // Graceful: iep_flag / section_504_flag may not exist yet (pre-migration 007)
        supabase.from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "active")
          .or("iep_flag.eq.true,section_504_flag.eq.true"),

        supabase.from("claim_packets")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .in("status", ["submitted", "needs_correction"]),

        supabase.from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .in("status", ["issued", "draft"])
          .gt("total", 0),
      ]);

      // Tutor compliance
      const tutors = (tutorData ?? []) as any[];
      let valid = 0, expired = 0, warning = 0;
      tutors.forEach(t => {
        if (!t.credential_expiration) { valid++; return; }
        const exp = new Date(t.credential_expiration);
        const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
        if (days < 0) expired++;
        else if (days <= 30) warning++;
        else valid++;
      });

      // Average GPA
      const grades = (gradeData ?? []) as any[];
      let avgGpa: number | null = null;
      if (grades.length > 0) {
        const pts = grades.map(g => g.gpa_points as number);
        avgGpa = pts.reduce((a, b) => a + b, 0) / pts.length;
      }

      // GPA trend — group by term
      const termMap = new Map<string, { name: string; start: string; pts: number[] }>();
      grades.forEach(g => {
        const term = g.terms as any;
        if (!term) return;
        const key = term.name;
        if (!termMap.has(key)) termMap.set(key, { name: term.name, start: term.start_date, pts: [] });
        termMap.get(key)!.pts.push(g.gpa_points);
      });
      const trendData: TermGpaBucket[] = Array.from(termMap.values())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .map(t => ({
          termName: t.name,
          startDate: t.start,
          avg: t.pts.reduce((a, b) => a + b, 0) / t.pts.length,
          count: t.pts.length,
        }));

      setStats({
        totalTutors: tutors.length,
        validTutors: valid,
        expiredTutors: expired,
        warningTutors: warning,
        avgGpa,
        supportStudents: (supportData as any)?.length ?? 0,
        openClaims: (claimData as any)?.length ?? 0,
        outstandingInvoices: (invoiceData as any)?.length ?? 0,
      });
      setTrend(trendData);
      setLoading(false);
    }

    load();
  }, [schoolId]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">Loading reports...</p>
      </div>
    );
  }

  const tutorCompliancePct = stats.totalTutors > 0
    ? Math.round((stats.validTutors / stats.totalTutors) * 100)
    : null;

  const quickReports = [
    {
      label: "Tutor Credential Compliance",
      desc: "Credential expiration status for all tutoring staff",
      badge: stats.expiredTutors > 0 ? `${stats.expiredTutors} expired` : stats.warningTutors > 0 ? `${stats.warningTutors} expiring` : "All valid",
      badgeColor: stats.expiredTutors > 0 ? "bg-red-50 text-red-700" : stats.warningTutors > 0 ? "bg-yellow-50 text-yellow-700" : "bg-teal-50 text-teal-700",
      path: "/reports/tutor-compliance",
    },
    {
      label: "Report Builder",
      desc: "Build a custom report from any SIS field or data source",
      badge: "Custom",
      badgeColor: "bg-blue-50 text-blue-700",
      path: "/reports/builder",
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-5xl mx-auto font-sans">

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">School-wide metrics, compliance, and custom reporting.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Tutor Compliance"
          value={tutorCompliancePct !== null ? `${tutorCompliancePct}%` : "—"}
          sub={`${stats.validTutors} of ${stats.totalTutors} valid`}
          accent={stats.expiredTutors > 0 ? "text-red-600" : stats.warningTutors > 0 ? "text-yellow-500" : "text-teal-600"}
          onClick={() => router.push("/reports/tutor-compliance")}
        />
        <StatCard
          label="Expired Credentials"
          value={stats.expiredTutors}
          sub={stats.warningTutors > 0 ? `${stats.warningTutors} expiring soon` : "0 expiring soon"}
          accent={stats.expiredTutors > 0 ? "text-red-600" : "text-gray-900"}
          onClick={() => router.push("/reports/tutor-compliance")}
        />
        <StatCard
          label="School Avg GPA"
          value={stats.avgGpa !== null ? stats.avgGpa.toFixed(2) : "—"}
          sub={trend.length > 1 ? `${trend.length} terms on record` : "All students with grades"}
          accent="text-blue-600"
        />
        <StatCard
          label="IEP / 504 Students"
          value={stats.supportStudents}
          sub="Active — requires support plan"
          accent={stats.supportStudents > 0 ? "text-indigo-600" : "text-gray-900"}
        />
        <StatCard
          label="Open Invoices"
          value={stats.outstandingInvoices}
          sub={stats.openClaims > 0 ? `${stats.openClaims} claims pending` : "No pending claims"}
          accent={stats.outstandingInvoices > 0 ? "text-amber-600" : "text-gray-900"}
        />
      </div>

      {/* ── GPA Trend ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">GPA Trend by Term</h2>
            <p className="text-xs text-gray-400 mt-0.5">School-wide average GPA across all recorded terms</p>
          </div>
          {trend.length > 0 && (
            <span className="text-xs font-semibold text-gray-400">
              {trend[trend.length - 1]?.count} student{trend[trend.length - 1]?.count !== 1 ? "s" : ""} · latest term
            </span>
          )}
        </div>
        <GpaTrendChart data={trend} />
      </div>

      {/* ── Quick Reports ── */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Available Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {quickReports.map(r => (
          <button
            key={r.path}
            onClick={() => router.push(r.path)}
            className="flex items-start justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer text-left group"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">{r.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{r.desc}</p>
            </div>
            <span className={`shrink-0 ml-3 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${r.badgeColor}`}>
              {r.badge}
            </span>
          </button>
        ))}

        {/* Placeholder canned reports */}
        {[
          { label: "Enrollment by Grade Level", desc: "Student counts per grade for the current academic year" },
          { label: "ESA Claim Status Report", desc: "All claim packets grouped by status and program" },
          { label: "Service Delivery Report", desc: "Hours delivered per student and provider by date range" },
          { label: "Outstanding Balance Report", desc: "Invoices with unpaid balances sorted by amount" },
        ].map(r => (
          <div key={r.label}
            className="flex items-start justify-between p-4 bg-white rounded-xl border border-gray-100 opacity-50">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{r.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
            </div>
            <span className="shrink-0 ml-3 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
              Coming soon
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default function ReportsDashboard() {
  return (
    <RoleGuard allowedRoles={["admin", "finance"]}>
      <ReportsDashboardInner />
    </RoleGuard>
  );
}
