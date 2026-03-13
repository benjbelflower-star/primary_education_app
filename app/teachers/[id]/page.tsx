"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

// ─── Types ─────────────────────────────────────────────────────────────────────

type StaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  role_type: string | null;
  employment_status: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
};

type AssignedStudent = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  grade_level: string | null;
  status: string;
};

type ServiceLogRow = {
  id: string;
  service_date: string;
  service_description: string;
  hours: number;
  student_display_name: string | null;
  student_id: string;
};

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

export default function TeacherDetailView() {
  const { id } = useParams();
  const router = useRouter();

  const [member,          setMember]          = useState<StaffMember | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [serviceLogs,     setServiceLogs]     = useState<ServiceLogRow[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [openSection,     setOpenSection]     = useState<string | null>("students");

  // Contact editable fields
  const [editEmail,       setEditEmail]       = useState("");
  const [editPhone,       setEditPhone]       = useState("");
  const [isUpdating,      setIsUpdating]      = useState(false);
  const [updateMessage,   setUpdateMessage]   = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [
        { data: staffData },
        { data: studentData },
        { data: logData },
      ] = await Promise.all([
        supabase
          .from("staff")
          .select("id, first_name, last_name, role_type, employment_status, email, phone, photo_url")
          .eq("id", id as string)
          .single(),

        supabase
          .from("students")
          .select("id, first_name, last_name, preferred_name, grade_level, status")
          .eq("homeroom_staff_id", id as string)
          .order("last_name"),

        supabase
          .from("service_logs")
          .select("id, service_date, service_description, hours, student_display_name, student_id")
          .eq("staff_id", id as string)
          .order("service_date", { ascending: false })
          .limit(50),
      ]);

      if (staffData) {
        const s = staffData as StaffMember;
        setMember(s);
        setEditEmail(s.email ?? "");
        setEditPhone(s.phone ?? "");
      }
      if (studentData) setAssignedStudents(studentData as AssignedStudent[]);
      if (logData)     setServiceLogs(logData as ServiceLogRow[]);

      setLoading(false);
    }
    load();
  }, [id]);

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage("Saving...");
    const { error } = await supabase
      .from("staff")
      .update({ email: editEmail || null, phone: editPhone || null })
      .eq("id", id);
    if (error) {
      setUpdateMessage("Error: " + error.message);
    } else {
      setUpdateMessage("Saved!");
      if (member) setMember({ ...member, email: editEmail || null, phone: editPhone || null });
    }
    setIsUpdating(false);
    setTimeout(() => setUpdateMessage(""), 3000);
  }

  function toggle(section: string) {
    setOpenSection(prev => prev === section ? null : section);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Loading staff profile...</p>
    </div>
  );

  if (!member) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Staff member not found.</p>
    </div>
  );

  const fullName = `${member.first_name} ${member.last_name}`;
  const bgColor  = avatarColor(fullName);

  const statusColor: Record<string, string> = {
    active:   "bg-teal-50 text-teal-700",
    inactive: "bg-gray-100 text-gray-500",
    on_leave: "bg-yellow-50 text-yellow-700",
  };

  const studentStatusColor: Record<string, string> = {
    active:    "bg-teal-50 text-teal-700",
    inactive:  "bg-gray-100 text-gray-500",
    graduated: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto font-sans">

      {/* Back */}
      <button
        onClick={() => router.push("/teachers")}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Staff Roster
      </button>

      {/* ── Profile card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">

        {/* Photo + name + actions */}
        <div className="flex items-start gap-4">

          {/* Avatar / photo */}
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={fullName}
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
              {initials(member.first_name, member.last_name)}
            </div>
          )}

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{fullName}</h1>
            {member.role_type && (
              <p className="text-sm text-gray-500 mt-0.5">{member.role_type}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={cx("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                statusColor[member.employment_status] ?? "bg-gray-100 text-gray-500")}>
                {member.employment_status.replace("_", " ")}
              </span>
              {assignedStudents.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                  {assignedStudents.length} Student{assignedStudents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={() => router.push("/messages/new?staffId=" + id)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              Message
            </button>
            <button onClick={() => router.push("/teachers/" + id + "/edit")}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              Edit
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4" />

        {/* Quick-info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <InfoCell label="Role Type"   value={member.role_type} />
          <InfoCell label="Email"       value={member.email} />
          <InfoCell label="Phone"       value={member.phone} />
          <InfoCell label="Status"      value={member.employment_status.replace("_", " ")} />
          <InfoCell label="Homeroom Students" value={assignedStudents.length > 0 ? `${assignedStudents.length}` : null} />
        </div>
      </div>

      {/* ── Accordion sections ── */}
      <div className="flex flex-col gap-2">

        {/* Assigned Students */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("students")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">
              Homeroom Students
              <span className="ml-2 text-xs font-normal text-gray-400">({assignedStudents.length})</span>
            </span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "students" && "rotate-90")}>›</span>
          </button>
          {openSection === "students" && (
            <div className="border-t border-gray-100">
              {assignedStudents.length === 0 ? (
                <p className="px-5 py-4 text-gray-400 text-sm">No students assigned to this teacher&apos;s homeroom.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {assignedStudents.map(student => {
                    const displayName = student.preferred_name
                      ? `${student.preferred_name} ${student.last_name}`
                      : `${student.first_name} ${student.last_name}`;
                    return (
                      <button
                        key={student.id}
                        onClick={() => router.push("/students/" + student.id)}
                        className="w-full flex items-center gap-3 px-5 py-3 bg-transparent border-none cursor-pointer text-left hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {student.grade_level ? `Grade ${student.grade_level}` : "Grade not set"}
                          </p>
                        </div>
                        <span className={cx(
                          "shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold",
                          studentStatusColor[student.status] ?? "bg-gray-100 text-gray-500"
                        )}>
                          {student.status}
                        </span>
                        <span className="text-gray-300 text-base shrink-0">›</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Service Logs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("logs")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">
              Service Logs
              <span className="ml-2 text-xs font-normal text-gray-400">({serviceLogs.length})</span>
            </span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "logs" && "rotate-90")}>›</span>
          </button>
          {openSection === "logs" && (
            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              {serviceLogs.length === 0 ? (
                <p className="text-gray-400 text-sm">No service logs recorded for this staff member.</p>
              ) : (
                <div className="overflow-x-auto -mx-5 sm:-mx-6">
                  <table className="w-full min-w-[460px] border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-left">
                        <th className="px-5 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                        <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                        <th className="px-2 py-3 pr-5 sm:pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceLogs.map(log => (
                        <tr
                          key={log.id}
                          onClick={() => router.push("/students/" + log.student_id)}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 sm:px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{log.service_date}</td>
                          <td className="px-2 py-3 text-sm text-gray-700 truncate max-w-[120px]">{log.student_display_name || "—"}</td>
                          <td className="px-2 py-3 text-sm text-gray-600 truncate max-w-[200px]">{log.service_description}</td>
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

        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => toggle("contact")}
            className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer text-left hover:bg-gray-50 transition-colors">
            <span className="text-base font-semibold text-gray-900">Contact Info</span>
            <span className={cx("text-gray-400 text-lg transition-transform inline-block", openSection === "contact" && "rotate-90")}>›</span>
          </button>
          {openSection === "contact" && (
            <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
              <form onSubmit={handleUpdateContact} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Email Address
                    </label>
                    <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Phone Number
                    </label>
                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
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

      </div>
    </div>
  );
}
