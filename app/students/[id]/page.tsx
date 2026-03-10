"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Student, Invoice, ServiceLog } from "../../../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type GuardianRow = {
  first_name: string;
  last_name: string;
  relationship: string | null;
  email: string | null;
};

type StaffName = { first_name: string; last_name: string } | null;
type UserName  = { first_name: string; last_name: string } | null;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function initials(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 leading-snug truncate">
        {value ?? <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StudentDetailView() {
  const { id } = useParams();
  const router = useRouter();

  const [student,        setStudent]        = useState<Student | null>(null);
  const [invoices,       setInvoices]       = useState<Invoice[]>([]);
  const [logs,           setLogs]           = useState<ServiceLog[]>([]);
  const [guardians,      setGuardians]      = useState<GuardianRow[]>([]);
  const [homeroomTeacher,setHomeroomTeacher]= useState<StaffName>(null);
  const [advisor,        setAdvisor]        = useState<UserName>(null);
  const [gpa,            setGpa]            = useState<number | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [openSection,    setOpenSection]    = useState<string | null>("service-history");

  const [guardianName,   setGuardianName]   = useState("");
  const [guardianEmail,  setGuardianEmail]  = useState("");
  const [isUpdating,     setIsUpdating]     = useState(false);
  const [updateMessage,  setUpdateMessage]  = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [
        { data: studentData },
        { data: invoiceData },
        { data: logData },
        { data: guardianData },
        { data: gradeData },
      ] = await Promise.all([
        supabase
          .from("students")
          .select(`
            *,
            homeroom_staff:homeroom_staff_id ( first_name, last_name ),
            advisor_user:advisor_id ( first_name, last_name )
          `)
          .eq("id", id as string)
          .single(),

        supabase
          .from("invoices")
          .select("*")
          .eq("student_id", id as string)
          .order("issue_date", { ascending: false }),

        supabase
          .from("service_logs")
          .select("*")
          .eq("student_id", id as string)
          .order("service_date", { ascending: false }),

        supabase
          .from("student_guardians")
          .select("relationship, guardians ( first_name, last_name, email )")
          .eq("student_id", id as string),

        supabase
          .from("term_grades")
          .select("gpa_points")
          .eq("student_id", id as string)
          .not("gpa_points", "is", null),
      ]);

      if (studentData) {
        const s = studentData as any;
        setStudent(s as Student);
        setGuardianName(s.guardian_name ?? "");
        setGuardianEmail(s.guardian_email ?? "");
        if (s.homeroom_staff) setHomeroomTeacher(s.homeroom_staff);
        if (s.advisor_user)   setAdvisor(s.advisor_user);
      }

      if (invoiceData) setInvoices(invoiceData as Invoice[]);
      if (logData)     setLogs(logData as ServiceLog[]);

      if (guardianData && guardianData.length > 0) {
        setGuardians(
          (guardianData as any[]).map(row => ({
            first_name:   row.guardians?.first_name  ?? "",
            last_name:    row.guardians?.last_name   ?? "",
            relationship: row.relationship           ?? null,
            email:        row.guardians?.email       ?? null,
          }))
        );
      }

      if (gradeData && gradeData.length > 0) {
        const pts = (gradeData as any[]).map(g => g.gpa_points as number);
        setGpa(pts.reduce((a, b) => a + b, 0) / pts.length);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function handleUpdateGuardian(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage("Saving...");
    const { error } = await supabase
      .from("students")
      .update({ guardian_name: guardianName, guardian_email: guardianEmail })
      .eq("id", id);
    if (error) {
      setUpdateMessage("Error: " + error.message);
    } else {
      setUpdateMessage("Guardian saved!");
      if (student) setStudent({ ...student, guardian_name: guardianName, guardian_email: guardianEmail });
    }
    setIsUpdating(false);
  }

  function toggle(section: string) {
    setOpenSection(prev => prev === section ? null : section);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Loading student profile...</p>
    </div>
  );

  if (!student) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Student not found.</p>
    </div>
  );

  const fullName    = `${student.first_name} ${student.last_name}`;
  const displayName = student.preferred_name
    ? `${student.preferred_name} ${student.last_name}`
    : fullName;
  const bgColor = avatarColor(fullName);

  const guardianDisplay = guardians.length > 0
    ? guardians.map(g => `${g.first_name} ${g.last_name}`).join(", ")
    : (student.guardian_name ?? null);

  const teacherDisplay = homeroomTeacher
    ? `${homeroomTeacher.first_name} ${homeroomTeacher.last_name}`
    : null;

  const advisorDisplay = advisor
    ? `${advisor.first_name} ${advisor.last_name}`
    : null;

  const sisLinks = [
    { label: "Schedule", icon: "📅", path: "/students/" + id + "/schedule", desc: "Classes & calendar" },
    { label: "Grades",   icon: "📊", path: "/students/" + id + "/grades",   desc: "GPA & assignments" },
  ];

  const statusColor: Record<string, string> = {
    active:    "bg-teal-50 text-teal-700",
    inactive:  "bg-gray-100 text-gray-500",
    graduated: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto font-sans">

      {/* Back */}
      <button
        onClick={() => router.push("/students")}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Roster
      </button>

      {/* ── Profile card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">

        {/* Photo + name + actions */}
        <div className="flex items-start gap-4">

          {/* Avatar / photo */}
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={displayName}
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
                       border: "3px solid #e2e8f0", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%", background: bgColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 700, color: "white", flexShrink: 0,
              border: "3px solid #e2e8f0", letterSpacing: 1, userSelect: "none",
            }}>
              {initials(student.first_name, student.last_name)}
            </div>
          )}

          {/* Name + status badges */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{displayName}</h1>
            {student.preferred_name && (
              <p className="text-xs text-gray-400 mt-0.5">Legal name: {fullName}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={cx("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                statusColor[student.status] ?? "bg-gray-100 text-gray-500")}>
                {student.status}
              </span>
              {student.grade_level && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  Grade {student.grade_level}
                </span>
              )}
              {gpa !== null && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                  GPA {gpa.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons — vertical stack */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={() => router.push("/students/" + id + "/schedule")}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer border-none whitespace-nowrap">
              Schedule
            </button>
            <button onClick={() => router.push("/students/" + id + "/grades")}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer border-none whitespace-nowrap">
              Grades
            </button>
            <button onClick={() => router.push("/messages/new?studentId=" + id)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              Message
            </button>
            <button onClick={() => router.push("/students/" + id + "/edit")}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              Edit
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4" />

        {/* Quick-info grid: 2 cols mobile, 3 cols sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <InfoCell label="Grade"            value={student.grade_level ? `Grade ${student.grade_level}` : null} />
          <InfoCell label="GPA"              value={gpa !== null ? gpa.toFixed(2) : null} />
          <InfoCell label="Primary Language" value={student.primary_language} />
          <InfoCell label="Homeroom Teacher" value={teacherDisplay} />
          <InfoCell label="Advisor"          value={advisorDisplay} />
          <InfoCell label="Guardian(s)"      value={guardianDisplay} />
        </div>

        {/* Classifications */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Student Classifications
          </p>
          {student.classifications && student.classifications.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {student.classifications.map(c => (
                <span key={c}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-300 italic">No classifications assigned — coming soon</p>
          )}
        </div>
      </div>

      {/* SIS Quick Nav */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {sisLinks.map(link => (
          <button
            key={link.label}
            onClick={() => router.push(link.path)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer text-left"
          >
            <span className="text-2xl">{link.icon}</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-400">{link.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Accordion sections ── */}
      <div className="flex flex-col gap-2">

        {/* Service History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("service-history")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">
              Service History
              <span className="ml-2 text-xs font-normal text-gray-400">({logs.length})</span>
            </span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "service-history" && "rotate-90")}>›</span>
          </button>
          {openSection === "service-history" && (
            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              {logs.length === 0 ? (
                <p className="text-gray-400 text-sm">No service logs recorded for this student.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 sm:-mx-6">
                  <table className="w-full min-w-[420px] border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-left">
                        <th className="px-5 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                        <th className="px-2 py-3 pr-5 sm:pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-5 sm:px-6 py-3 text-sm text-gray-700">{log.service_date}</td>
                          <td className="px-2 py-3 text-sm text-gray-700">{log.service_description}</td>
                          <td className="px-2 py-3 pr-5 sm:pr-6 text-sm text-gray-700">{log.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("billing")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">
              Billing History
              <span className="ml-2 text-xs font-normal text-gray-400">({invoices.length})</span>
            </span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "billing" && "rotate-90")}>›</span>
          </button>
          {openSection === "billing" && (
            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              {invoices.length === 0 ? (
                <p className="text-gray-400 text-sm">No invoices generated yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {invoices.map(inv => (
                    <div key={inv.id}
                      onClick={() => router.push("/invoices/" + inv.id)}
                      className="flex justify-between items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">Invoice {inv.invoice_number}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Issued: {inv.issue_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-gray-900">${inv.total}</div>
                        <div className="text-xs text-teal-600 font-medium mt-0.5">{inv.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guardian Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("guardian")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">Guardian Info</span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "guardian" && "rotate-90")}>›</span>
          </button>
          {openSection === "guardian" && (
            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              {/* Relational guardians (from student_guardians table) */}
              {guardians.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  {guardians.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {((g.first_name[0] ?? "") + (g.last_name[0] ?? "")).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{g.first_name} {g.last_name}</p>
                        <p className="text-xs text-gray-400">
                          {g.relationship ?? "Guardian"}{g.email ? " · " + g.email : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Legacy editable contact fields */}
              <form onSubmit={handleUpdateGuardian} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                    Primary Contact Name
                  </label>
                  <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input type="email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)}
                    placeholder="guardian@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={isUpdating}
                  className={cx("w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors mt-1",
                    isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700 cursor-pointer")}>
                  {isUpdating ? "Saving..." : "Save Contact Info"}
                </button>
                {updateMessage && (
                  <div className={cx("mt-1 p-2 rounded-lg text-center text-sm font-semibold",
                    updateMessage.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
                    {updateMessage}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Compliance Note */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("compliance")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">Compliance Note</span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "compliance" && "rotate-90")}>›</span>
          </button>
          {openSection === "compliance" && (
            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                This student is enrolled in the ESA program. All tutoring logs must include an approved tutor credential to be valid for ClassWallet submission.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
