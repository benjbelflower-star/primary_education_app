"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useRole } from "../../../contexts/RoleContext";
import RoleGuard from "../../../components/RoleGuard";
import { ShareReportModal } from "../../../components/ShareReportModal";

// ─── Report Catalog ───────────────────────────────────────────────────────────

type FieldType = "text" | "number" | "boolean" | "date" | "currency" | "array";

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
};

type EntityDef = {
  key: string;
  label: string;
  description: string;
  table: string;
  defaultFields: string[];
  fields: FieldDef[];
};

const CATALOG: EntityDef[] = [
  {
    key: "students",
    label: "Students",
    description: "Student profiles, classifications, compliance flags, and contact info",
    table: "students",
    defaultFields: ["last_name", "first_name", "grade_level", "status"],
    fields: [
      { key: "student_number",    label: "Student Number",     type: "text" },
      { key: "state_student_id",  label: "State ID",           type: "text" },
      { key: "last_name",         label: "Last Name",          type: "text" },
      { key: "first_name",        label: "First Name",         type: "text" },
      { key: "middle_name",       label: "Middle Name",        type: "text" },
      { key: "preferred_name",    label: "Preferred Name",     type: "text" },
      { key: "dob",               label: "Date of Birth",      type: "date" },
      { key: "grade_level",       label: "Grade Level",        type: "text" },
      { key: "status",            label: "Status",             type: "text" },
      { key: "enrollment_date",   label: "Enrollment Date",    type: "date" },
      { key: "withdrawal_date",   label: "Withdrawal Date",    type: "date" },
      { key: "withdrawal_reason", label: "Withdrawal Reason",  type: "text" },
      { key: "primary_language",  label: "Primary Language",   type: "text" },
      { key: "email",             label: "Student Email",      type: "text" },
      { key: "phone",             label: "Student Phone",      type: "text" },
      { key: "guardian_name",     label: "Guardian Name",      type: "text" },
      { key: "guardian_email",    label: "Guardian Email",     type: "text" },
      { key: "guardian_phone",    label: "Guardian Phone",     type: "text" },
      { key: "classifications",   label: "Classifications",    type: "array" },
      { key: "iep_flag",          label: "IEP",                type: "boolean" },
      { key: "section_504_flag",  label: "504 Plan",           type: "boolean" },
      { key: "ell_flag",          label: "ELL",                type: "boolean" },
      { key: "medical_alert_flag",label: "Medical Alert",      type: "boolean" },
      { key: "created_at",        label: "Record Created",     type: "date" },
    ],
  },
  {
    key: "service_logs",
    label: "Service Logs",
    description: "Tutoring sessions, service delivery records, and ESA-eligible activities",
    table: "service_logs",
    defaultFields: ["service_date", "service_description", "hours", "esa_category"],
    fields: [
      { key: "service_date",           label: "Service Date",        type: "date" },
      { key: "service_description",    label: "Description",         type: "text" },
      { key: "hours",                  label: "Hours",               type: "number" },
      { key: "start_time",             label: "Start Time",          type: "text" },
      { key: "end_time",               label: "End Time",            type: "text" },
      { key: "duration_minutes",       label: "Duration (min)",      type: "number" },
      { key: "delivery_mode",          label: "Delivery Mode",       type: "text" },
      { key: "location",               label: "Location",            type: "text" },
      { key: "esa_category",           label: "ESA Category",        type: "text" },
      { key: "billable_flag",          label: "Billable",            type: "boolean" },
      { key: "esa_eligible_flag",      label: "ESA Eligible",        type: "boolean" },
      { key: "provider_name_snapshot", label: "Provider Name",       type: "text" },
      { key: "group_session_flag",     label: "Group Session",       type: "boolean" },
      { key: "student_count",          label: "Student Count",       type: "number" },
      { key: "notes",                  label: "Notes",               type: "text" },
      { key: "created_at",             label: "Date Logged",         type: "date" },
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    description: "Invoice headers, billing status, ESA readiness, and outstanding balances",
    table: "invoices",
    defaultFields: ["invoice_number", "issue_date", "status", "total"],
    fields: [
      { key: "invoice_number",        label: "Invoice Number",      type: "text" },
      { key: "issue_date",            label: "Issue Date",          type: "date" },
      { key: "due_date",              label: "Due Date",            type: "date" },
      { key: "billing_period_start",  label: "Period Start",        type: "date" },
      { key: "billing_period_end",    label: "Period End",          type: "date" },
      { key: "status",                label: "Status",              type: "text" },
      { key: "subtotal",              label: "Subtotal",            type: "currency" },
      { key: "discount_amount",       label: "Discount",            type: "currency" },
      { key: "tax",                   label: "Tax",                 type: "currency" },
      { key: "total",                 label: "Total",               type: "currency" },
      { key: "balance_due",           label: "Balance Due",         type: "currency" },
      { key: "classwallet_ready_flag",label: "ClassWallet Ready",   type: "boolean" },
      { key: "submission_ready_flag", label: "Submission Ready",    type: "boolean" },
      { key: "student_display_name",  label: "Student Name",        type: "text" },
      { key: "student_grade_level",   label: "Student Grade",       type: "text" },
      { key: "tutor_name",            label: "Tutor Name",          type: "text" },
      { key: "tutor_credential_type", label: "Tutor Credential",    type: "text" },
      { key: "tutoring_subject",      label: "Subject",             type: "text" },
      { key: "notes",                 label: "Notes",               type: "text" },
      { key: "created_at",            label: "Created",             type: "date" },
    ],
  },
  {
    key: "tutors",
    label: "Tutors",
    description: "Tutor profiles, credentials, and ESA provider approval status",
    table: "tutors",
    defaultFields: ["full_name", "credential_type", "credential_expiration", "is_active"],
    fields: [
      { key: "full_name",            label: "Full Name",           type: "text" },
      { key: "email",                label: "Email",               type: "text" },
      { key: "phone",                label: "Phone",               type: "text" },
      { key: "credential_type",      label: "Credential Type",     type: "text" },
      { key: "field_of_study",       label: "Field of Study",      type: "text" },
      { key: "degree_title",         label: "Degree Title",        type: "text" },
      { key: "issue_date",           label: "Credential Issued",   type: "date" },
      { key: "credential_expiration",label: "Credential Expires",  type: "date" },
      { key: "is_active",            label: "Active",              type: "boolean" },
      { key: "created_at",           label: "Added",               type: "date" },
    ],
  },
  {
    key: "enrollments",
    label: "Enrollments",
    description: "Student enrollment history, programs, funding sources, and exit data",
    table: "enrollments",
    defaultFields: ["grade_level", "status", "funding_source", "entry_date"],
    fields: [
      { key: "grade_level",      label: "Grade Level",      type: "text" },
      { key: "status",           label: "Status",           type: "text" },
      { key: "funding_source",   label: "Funding Source",   type: "text" },
      { key: "residency_status", label: "Residency",        type: "text" },
      { key: "entry_date",       label: "Entry Date",       type: "date" },
      { key: "exit_date",        label: "Exit Date",        type: "date" },
      { key: "exit_reason",      label: "Exit Reason",      type: "text" },
      { key: "notes",            label: "Notes",            type: "text" },
      { key: "created_at",       label: "Created",          type: "date" },
    ],
  },
  {
    key: "claim_packets",
    label: "Claim Packets",
    description: "ESA reimbursement packets, submission status, and payment tracking",
    table: "claim_packets",
    defaultFields: ["claim_program_name", "status", "submission_date", "reimbursed_amount"],
    fields: [
      { key: "claim_program_name",   label: "Program Name",        type: "text" },
      { key: "claim_program_case_id",label: "Case ID",             type: "text" },
      { key: "status",               label: "Status (legacy)",     type: "text" },
      { key: "packet_status",        label: "Packet Status",       type: "text" },
      { key: "submission_date",      label: "Submission Date",     type: "date" },
      { key: "approval_date",        label: "Approval Date",       type: "date" },
      { key: "reimbursement_date",   label: "Reimbursement Date",  type: "date" },
      { key: "reimbursed_amount",    label: "Amount Reimbursed",   type: "currency" },
      { key: "packet_notes",         label: "Notes",               type: "text" },
      { key: "created_at",           label: "Created",             type: "date" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    description: "Teachers, support staff, credentials, and ESA provider approval",
    table: "staff",
    defaultFields: ["first_name", "last_name", "role_type", "employment_status"],
    fields: [
      { key: "staff_number",              label: "Staff Number",          type: "text" },
      { key: "first_name",                label: "First Name",            type: "text" },
      { key: "last_name",                 label: "Last Name",             type: "text" },
      { key: "email",                     label: "Email",                 type: "text" },
      { key: "phone",                     label: "Phone",                 type: "text" },
      { key: "role_type",                 label: "Role Type",             type: "text" },
      { key: "employment_status",         label: "Employment Status",     type: "text" },
      { key: "hire_date",                 label: "Hire Date",             type: "date" },
      { key: "end_date",                  label: "End Date",              type: "date" },
      { key: "credential_status",         label: "Credential Status",     type: "text" },
      { key: "credential_number",         label: "Credential Number",     type: "text" },
      { key: "background_check_status",   label: "Background Check",      type: "text" },
      { key: "background_check_date",     label: "Background Check Date", type: "date" },
      { key: "esa_provider_approved_flag",label: "ESA Approved",          type: "boolean" },
      { key: "active_flag",               label: "Active",                type: "boolean" },
    ],
  },
];

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterOp =
  | "contains" | "not_contains"
  | "eq" | "not_eq"
  | "gt" | "gte" | "lt" | "lte"
  | "is_true" | "is_false"
  | "before" | "after"
  | "arr_includes" | "arr_excludes" | "arr_is_empty" | "arr_not_empty";

type FilterRow    = { id: string; field: string; op: FilterOp; value: string };
type StoredFilter = { field: string; op: FilterOp; value: string };

type SavedReport = {
  id: string;
  school_id: string;
  report_name: string;
  description: string | null;
  entity_key: string;
  selected_fields: string[];
  filters: StoredFilter[];
  sort_field: string | null;
  sort_dir: "asc" | "desc";
  row_limit: number;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
};

function opsFor(type: FieldType): { value: FilterOp; label: string }[] {
  if (type === "boolean") return [
    { value: "is_true",  label: "is Yes" },
    { value: "is_false", label: "is No"  },
  ];
  if (type === "array") return [
    { value: "arr_includes",  label: "includes"         },
    { value: "arr_excludes",  label: "does not include" },
    { value: "arr_not_empty", label: "has any value"    },
    { value: "arr_is_empty",  label: "is empty"         },
  ];
  if (type === "number" || type === "currency") return [
    { value: "eq",  label: "equals"       },
    { value: "gt",  label: "greater than" },
    { value: "gte", label: "at least"     },
    { value: "lt",  label: "less than"    },
    { value: "lte", label: "at most"      },
  ];
  if (type === "date") return [
    { value: "after",  label: "after"  },
    { value: "before", label: "before" },
    { value: "eq",     label: "equals" },
  ];
  return [
    { value: "contains",     label: "contains"         },
    { value: "not_contains", label: "does not contain" },
    { value: "eq",           label: "equals exactly"   },
    { value: "not_eq",       label: "is not"           },
  ];
}

// ShareReportModal is imported from components/ShareReportModal.tsx

function ShareModal_UNUSED_PLACEHOLDER() {
  const [search,     setSearch]     = useState("");
  const [candidates, setCandidates] = useState<{id:string;type:string;name:string;email:string;role?:string}[]>([]);
  const [existing,   setExisting]   = useState<{id:string;type:string;name:string;email:string}[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [sharing,    setSharing]    = useState<string | null>(null);
  const [removing,   setRemoving]   = useState<string | null>(null);
  const [shareError, setShareError] = useState("");

  // Load current shares on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("report_shares")
        .select("id, recipient_user_id, recipient_guardian_id, recipient_name, recipient_email")
        .eq("saved_report_id", reportId);
      if (data) {
        setExisting((data as any[]).map(r => ({
          id: r.recipient_user_id ?? r.recipient_guardian_id,
          type: r.recipient_user_id ? "user" : "guardian",
          name: r.recipient_name,
          email: r.recipient_email,
          shareRowId: r.id,
        })));
      }
    })();
  }, [reportId]);

  // Search system users + guardians
  useEffect(() => {
    if (search.trim().length < 2) { setCandidates([]); return; }
    const q = search.trim().toLowerCase();
    setLoading(true);
    const timer = setTimeout(async () => {
      const [{ data: users }, { data: guardians }] = await Promise.all([
        supabase.from("users")
          .select("id, first_name, last_name, email")
          .eq("school_id", schoolId)
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(10),
        supabase.from("guardians")
          .select("id, first_name, last_name, email")
          .eq("school_id", schoolId)
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(10),
      ]);
      const results: SystemRecipient[] = [
        ...((users ?? []) as any[]).map(u => ({
          id: u.id, type: "user" as const,
          name: `${u.first_name} ${u.last_name}`.trim(),
          email: u.email ?? "", role: "Staff",
        })),
        ...((guardians ?? []) as any[]).map(g => ({
          id: g.id, type: "guardian" as const,
          name: `${g.first_name} ${g.last_name}`.trim(),
          email: g.email ?? "", role: "Guardian",
        })),
      ];
      setCandidates(results);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, schoolId]);

  async function share(rec: SystemRecipient) {
    if (existing.some(e => e.id === rec.id)) return;
    setSharing(rec.id); setShareError("");
    const payload: Record<string, unknown> = {
      school_id: schoolId, saved_report_id: reportId,
      recipient_name: rec.name, recipient_email: rec.email,
    };
    if (rec.type === "user")     payload.recipient_user_id     = rec.id;
    if (rec.type === "guardian") payload.recipient_guardian_id = rec.id;
    const { error } = await supabase.from("report_shares").insert(payload);
    if (error) { setShareError(error.message); }
    else { setExisting(prev => [...prev, rec]); setSearch(""); setCandidates([]); }
    setSharing(null);
  }

  async function removeShare(rec: SystemRecipient) {
    setRemoving(rec.id);
    const col = rec.type === "user" ? "recipient_user_id" : "recipient_guardian_id";
    await supabase.from("report_shares").delete()
      .eq("saved_report_id", reportId).eq(col, rec.id);
    setExisting(prev => prev.filter(e => e.id !== rec.id));
    setRemoving(null);
  }

  const alreadyShared = (id: string) => existing.some(e => e.id === id);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, backgroundColor: "white", borderRadius: 16, padding: "28px 24px", width: "min(480px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>Share Report</h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{reportName}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>

        {/* Compliance notice */}
        <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 14, fontSize: 11, color: "#64748b" }}>
          Sharing is restricted to verified system contacts only. Free-text email entry is not permitted.
        </div>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
          {loading && (
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", border: "2px solid #e2e8f0", borderTopColor: "#3b82f6", animation: "spin 0.7s linear infinite" }} />
          )}
        </div>

        {/* Search results dropdown */}
        {candidates.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
            {candidates.map(rec => {
              const already = alreadyShared(rec.id);
              return (
                <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid #f8fafc", backgroundColor: already ? "#f8fafc" : "white" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: rec.type === "guardian" ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: rec.type === "guardian" ? "#16a34a" : "#2563eb", flexShrink: 0 }}>
                    {rec.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.name}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{rec.email} · {rec.role}</p>
                  </div>
                  <button
                    onClick={() => !already && share(rec)}
                    disabled={already || sharing === rec.id}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: already ? "default" : "pointer", backgroundColor: already ? "#f1f5f9" : "#0f172a", color: already ? "#94a3b8" : "white", flexShrink: 0 }}>
                    {sharing === rec.id ? "..." : already ? "Shared" : "Share"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {search.length >= 2 && !loading && candidates.length === 0 && (
          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 14 }}>
            No system contacts found for "{search}"
          </p>
        )}

        {shareError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{shareError}</p>}

        {/* Shared with list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Shared with ({existing.length})
          </p>
          {existing.length === 0 ? (
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Not shared with anyone yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {existing.map(rec => (
                <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, backgroundColor: "#f8fafc" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: rec.type === "guardian" ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: rec.type === "guardian" ? "#16a34a" : "#2563eb", flexShrink: 0 }}>
                    {rec.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>{rec.name}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{rec.email}</p>
                  </div>
                  <button
                    onClick={() => removeShare(rec)}
                    disabled={removing === rec.id}
                    style={{ fontSize: 11, color: "#ef4444", backgroundColor: "transparent", border: "none", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                    {removing === rec.id ? "..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cx(...cs: (string | false | null | undefined)[]) {
  return cs.filter(Boolean).join(" ");
}

function formatCell(value: unknown, type: FieldType): string {
  if (value === null || value === undefined) return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "array") {
    if (!Array.isArray(value)) return "—";
    return value.length === 0 ? "—" : value.join(", ");
  }
  if ((type === "currency" || type === "number") && typeof value === "number")
    return type === "currency" ? `$${value.toFixed(2)}` : String(value);
  if (type === "date" && typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }
  return String(value);
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return mins <= 1 ? "just now" : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function exportCSV(fields: FieldDef[], rows: Record<string, unknown>[], entityLabel: string) {
  const lines = [
    fields.map(f => `"${f.label}"`).join(","),
    ...rows.map(row =>
      fields.map(f => {
        const v = row[f.key];
        if (v === null || v === undefined) return "";
        if (typeof v === "boolean") return v ? "Yes" : "No";
        if (Array.isArray(v)) return `"${v.join(", ")}"`;
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${entityLabel.toLowerCase().replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Save Modal ───────────────────────────────────────────────────────────────

function SaveModal({
  initialName, initialDesc, isUpdate, saving, onSave, onClose,
}: {
  initialName: string; initialDesc: string; isUpdate: boolean;
  saving: boolean;
  onSave: (name: string, desc: string, saveAsNew: boolean) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [asNew, setAsNew] = useState(false);

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, backgroundColor: "white", borderRadius: 16, padding: "28px 24px", width: "min(440px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            {isUpdate && !asNew ? "Update Report" : "Save Report"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Report Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Active ESA Students" />
          </div>
          <div>
            <label style={lbl}>Description <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
            <textarea className={inp} value={desc} rows={2} onChange={e => setDesc(e.target.value)}
              placeholder="What is this report used for?" style={{ resize: "none" }} />
          </div>
          {isUpdate && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
              <input type="checkbox" checked={asNew} onChange={e => setAsNew(e.target.checked)} style={{ width: 14, height: 14 }} />
              Save as a new report (keep the original)
            </label>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancel</button>
            <button onClick={() => name.trim() && onSave(name.trim(), desc.trim(), asNew)} disabled={saving || !name.trim()}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "white", fontSize: 13, fontWeight: 600, cursor: saving || !name.trim() ? "not-allowed" : "pointer", opacity: saving || !name.trim() ? 0.6 : 1 }}>
              {saving ? "Saving..." : isUpdate && !asNew ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function ReportBuilderInner() {
  const router = useRouter();
  const { schoolId } = useRole();

  const [entity,         setEntity]         = useState<EntityDef | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters,        setFilters]        = useState<FilterRow[]>([]);
  const [sortField,      setSortField]      = useState<string>("");
  const [sortDir,        setSortDir]        = useState<"asc" | "desc">("asc");
  const [limit,          setLimit]          = useState<number>(250);
  const [results,        setResults]        = useState<Record<string, unknown>[] | null>(null);
  const [running,        setRunning]        = useState(false);
  const [error,          setError]          = useState("");

  const [savedReports,   setSavedReports]   = useState<SavedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [saveModalOpen,  setSaveModalOpen]  = useState(false);
  const [saveName,       setSaveName]       = useState("");
  const [saveDesc,       setSaveDesc]       = useState("");
  const [saving,         setSaving]         = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [viewSaved,      setViewSaved]      = useState(false);
  const [shareTarget,    setShareTarget]    = useState<{id:string;name:string}|null>(null);

  useEffect(() => { if (schoolId) loadSavedReports(); }, [schoolId]);

  async function loadSavedReports() {
    if (!schoolId) return;
    const { data } = await supabase
      .from("saved_reports").select("*").eq("school_id", schoolId)
      .order("updated_at", { ascending: false });
    if (data) setSavedReports(data as SavedReport[]);
  }

  function selectEntity(e: EntityDef) {
    setEntity(e); setSelectedFields(e.defaultFields); setFilters([]);
    setResults(null); setError(""); setSortField("");
    setActiveReportId(null); setSaveName(""); setSaveDesc("");
  }

  function toggleField(key: string) {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function addFilter() {
    if (!entity) return;
    const first = entity.fields[0];
    setFilters(prev => [...prev, { id: crypto.randomUUID(), field: first.key, op: opsFor(first.type)[0].value, value: "" }]);
  }

  function updateFilter(id: string, patch: Partial<FilterRow>) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function removeFilter(id: string) {
    setFilters(prev => prev.filter(f => f.id !== id));
  }

  function loadReport(report: SavedReport) {
    const e = CATALOG.find(c => c.key === report.entity_key);
    if (!e) return;
    setEntity(e);
    setSelectedFields(report.selected_fields);
    setFilters(report.filters.map(f => ({ ...f, id: crypto.randomUUID() })));
    setSortField(report.sort_field ?? "");
    setSortDir(report.sort_dir);
    setLimit(report.row_limit);
    setActiveReportId(report.id);
    setSaveName(report.report_name);
    setSaveDesc(report.description ?? "");
    setResults(null); setError("");
  }

  async function handleSaveReport(name: string, desc: string, saveAsNew: boolean) {
    if (!entity || !schoolId) return;
    setSaving(true);
    const payload = {
      school_id: schoolId, report_name: name, description: desc || null,
      entity_key: entity.key, selected_fields: selectedFields,
      filters: filters.map(({ field, op, value }) => ({ field, op, value })),
      sort_field: sortField || null, sort_dir: sortDir, row_limit: limit,
    };
    if (activeReportId && !saveAsNew) {
      await supabase.from("saved_reports").update(payload).eq("id", activeReportId);
    } else {
      const { data } = await supabase.from("saved_reports").insert(payload).select("id").single();
      if (data) setActiveReportId((data as any).id);
    }
    setSaveName(name); setSaveDesc(desc);
    await loadSavedReports();
    setSaving(false); setSaveModalOpen(false);
  }

  async function handleDeleteReport(id: string) {
    await supabase.from("saved_reports").delete().eq("id", id);
    if (activeReportId === id) { setActiveReportId(null); setSaveName(""); setSaveDesc(""); }
    setDeleteConfirm(null);
    await loadSavedReports();
  }

  async function runReport() {
    if (!entity || !schoolId || selectedFields.length === 0) return;
    setRunning(true); setError(""); setResults(null);
    try {
      let query = supabase.from(entity.table)
        .select(["school_id", ...selectedFields].join(", "))
        .eq("school_id", schoolId).limit(limit);

      const noVal = new Set(["is_true","is_false","arr_is_empty","arr_not_empty"]);
      for (const f of filters) {
        const fd = entity.fields.find(x => x.key === f.field);
        if (!fd || (!f.value && !noVal.has(f.op))) continue;
        switch (f.op) {
          case "contains":      query = query.ilike(f.field, `%${f.value}%`); break;
          case "not_contains":  query = query.not(f.field, "ilike", `%${f.value}%`); break;
          case "eq":            query = query.eq(f.field, f.value); break;
          case "not_eq":        query = query.neq(f.field, f.value); break;
          case "gt":            query = query.gt(f.field, f.value); break;
          case "gte":           query = query.gte(f.field, f.value); break;
          case "lt":            query = query.lt(f.field, f.value); break;
          case "lte":           query = query.lte(f.field, f.value); break;
          case "is_true":       query = query.eq(f.field, true); break;
          case "is_false":      query = query.eq(f.field, false); break;
          case "after":         query = query.gte(f.field, f.value); break;
          case "before":        query = query.lte(f.field, f.value); break;
          case "arr_includes":  query = query.contains(f.field, [f.value.trim()]); break;
          case "arr_excludes":  query = query.not(f.field, "cs", `{${f.value.trim()}}`); break;
          case "arr_not_empty": query = query.neq(f.field, "{}"); break;
          case "arr_is_empty":  query = query.eq(f.field, "{}"); break;
        }
      }
      if (sortField) query = query.order(sortField, { ascending: sortDir === "asc" });

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      setResults((data ?? []) as unknown as Record<string, unknown>[]);

      if (activeReportId) {
        const prev = savedReports.find(r => r.id === activeReportId);
        await supabase.from("saved_reports").update({
          last_run_at: new Date().toISOString(),
          run_count: (prev?.run_count ?? 0) + 1,
        }).eq("id", activeReportId);
        await loadSavedReports();
      }
    } catch (e: any) { setError(e.message ?? "Query failed."); }
    setRunning(false);
  }

  const activeFieldDefs = entity?.fields.filter(f => selectedFields.includes(f.key)) ?? [];
  const inp = "px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-6xl mx-auto font-sans">

      <button onClick={() => router.push("/reports")}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block">
        ← Back to Reports
      </button>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Report Builder</h1>
          <p className="text-sm text-gray-400 mt-1">Select a data source, choose fields, add filters, and save for later.</p>
        </div>
        {entity && (
          <div className="flex items-center gap-2">
            {activeReportId && (
              <button onClick={() => setShareModalOpen(true)}
                title="Share this report"
                className="shrink-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
            )}
            <button onClick={() => setSaveModalOpen(true)}
              className="shrink-0 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
              {activeReportId ? "Save Changes" : "Save Report"}
            </button>
          </div>
        )}
      </div>

      {/* ── Saved Reports ── */}
      {savedReports.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Saved Reports</p>
            <span className="text-xs text-gray-400">{savedReports.length} saved</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {savedReports.map(r => {
              const isActive = r.id === activeReportId;
              const cat = CATALOG.find(c => c.key === r.entity_key);
              return (
                <div key={r.id}
                  className={cx(
                    "shrink-0 w-52 rounded-xl border p-3.5 cursor-pointer transition-all group flex flex-col gap-1.5",
                    isActive ? "border-slate-900 bg-slate-900" : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                  )}
                  onClick={() => loadReport(r)}>
                  <div className="flex items-start justify-between gap-1">
                    <p className={cx("font-semibold text-sm leading-snug line-clamp-2", isActive ? "text-white" : "text-gray-900")}>
                      {r.report_name}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(r.id); }}
                      className={cx(
                        "shrink-0 w-5 h-5 flex items-center justify-center text-sm font-bold bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity",
                        isActive ? "text-slate-400 hover:text-red-300" : "text-gray-400 hover:text-red-500"
                      )}>×</button>
                  </div>
                  {r.description && (
                    <p className={cx("text-xs leading-snug line-clamp-2", isActive ? "text-slate-400" : "text-gray-400")}>
                      {r.description}
                    </p>
                  )}
                  <p className={cx("text-xs", isActive ? "text-slate-400" : "text-gray-400")}>{cat?.label ?? r.entity_key}</p>
                  <div className={cx("flex items-center justify-between text-xs mt-auto pt-1.5 border-t", isActive ? "border-slate-700 text-slate-400" : "border-gray-100 text-gray-400")}>
                    <span>Run {r.run_count}×</span>
                    <span>{timeAgo(r.last_run_at)}</span>
                  </div>
                  <div className="flex gap-1.5 mt-0.5">
                    <button
                      onClick={e => { e.stopPropagation(); loadReport(r); setTimeout(() => runReport(), 50); }}
                      className={cx(
                        "flex-1 py-1 rounded-lg text-xs font-semibold border-none cursor-pointer transition-colors",
                        isActive ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-slate-700"
                      )}>
                      Run
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); loadReport(r); setShareModalOpen(true); }}
                      title="Share"
                      className={cx(
                        "px-2 py-1 rounded-lg border-none cursor-pointer transition-colors",
                        isActive ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left panel */}
        <div className="flex flex-col gap-4 lg:w-80 shrink-0">

          {/* 1 — Data Source */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">1 — Data Source</p>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {/* Saved Reports — special entry */}
              <button
                onClick={() => { setViewSaved(true); setEntity(null); setResults(null); }}
                className={cx("w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border",
                  viewSaved
                    ? "bg-blue-600 text-white border-blue-600 font-semibold"
                    : "bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300 hover:bg-blue-100"
                )}>
                <p className="font-semibold leading-tight flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline" }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Saved Reports
                  {savedReports.length > 0 && <span className={cx("ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full", viewSaved ? "bg-white text-blue-600" : "bg-blue-100 text-blue-600")}>{savedReports.length}</span>}
                </p>
                <p className={cx("text-xs mt-0.5 leading-snug", viewSaved ? "text-blue-200" : "text-blue-500")}>Manage, share, and re-run saved reports</p>
              </button>

              <div className="border-t border-gray-100 my-1" />

              {CATALOG.map(e => (
                <button key={e.key} onClick={() => { selectEntity(e); setViewSaved(false); }}
                  className={cx("w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border",
                    entity?.key === e.key && !viewSaved
                      ? "bg-slate-900 text-white border-slate-900 font-semibold"
                      : "bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50"
                  )}>
                  <p className="font-semibold leading-tight">{e.label}</p>
                  <p className={cx("text-xs mt-0.5 leading-snug", entity?.key === e.key && !viewSaved ? "text-slate-300" : "text-gray-400")}>{e.description}</p>
                </button>
              ))}
            </div>
          </div>

          {entity && (
            <>
              {/* 2 — Fields */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">2 — Fields</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedFields(entity.fields.map(f => f.key))} className="text-xs text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer p-0">All</button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setSelectedFields(entity.defaultFields)} className="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0">Default</button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setSelectedFields([])} className="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0">None</button>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {entity.fields.map(f => (
                    <label key={f.key} className="flex items-center gap-2.5 px-1 py-1 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} className="w-3.5 h-3.5 accent-slate-800 cursor-pointer" />
                      <span className="text-sm text-gray-700 leading-tight">{f.label}</span>
                      <span className="ml-auto text-xs text-gray-300 shrink-0">{f.type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3 — Filters */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">3 — Filters</p>
                  <button onClick={addFilter} className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer p-0">+ Add</button>
                </div>
                {filters.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400">No filters — all records returned.</p>
                ) : (
                  <div className="p-3 flex flex-col gap-3">
                    {filters.map(filter => {
                      const fieldDef = entity.fields.find(f => f.key === filter.field)!;
                      const ops = opsFor(fieldDef?.type ?? "text");
                      const needsValue = !["is_true","is_false","arr_is_empty","arr_not_empty"].includes(filter.op);
                      return (
                        <div key={filter.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <select value={filter.field}
                              onChange={e => {
                                const nf = entity.fields.find(f => f.key === e.target.value)!;
                                updateFilter(filter.id, { field: e.target.value, op: opsFor(nf.type)[0].value, value: "" });
                              }}
                              className={inp + " flex-1 min-w-0"}>
                              {entity.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>
                            <button onClick={() => removeFilter(filter.id)} className="text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer text-lg leading-none shrink-0">×</button>
                          </div>
                          <select value={filter.op} onChange={e => updateFilter(filter.id, { op: e.target.value as FilterOp })} className={inp + " w-full"}>
                            {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {needsValue && (
                            <input type={fieldDef?.type === "date" ? "date" : "text"} value={filter.value}
                              onChange={e => updateFilter(filter.id, { value: e.target.value })}
                              placeholder={fieldDef?.type === "array" ? "e.g. ESE, ELL, Gifted" : "Value..."}
                              className={inp + " w-full"} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4 — Sort + Limit */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">4 — Sort & Limit</p>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select value={sortField} onChange={e => setSortField(e.target.value)} className={inp + " flex-1"}>
                      <option value="">— no sort —</option>
                      {entity.fields.filter(f => selectedFields.includes(f.key)).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <select value={sortDir} onChange={e => setSortDir(e.target.value as "asc" | "desc")} className={inp + " w-24"}>
                      <option value="asc">A → Z</option>
                      <option value="desc">Z → A</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 shrink-0">Max rows</label>
                    <select value={limit} onChange={e => setLimit(Number(e.target.value))} className={inp + " flex-1"}>
                      {[50, 100, 250, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Run */}
              <button onClick={runReport} disabled={running || selectedFields.length === 0}
                className={cx("w-full py-3 rounded-xl text-sm font-bold transition-colors border-none",
                  running || selectedFields.length === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-700 cursor-pointer")}>
                {running ? "Running report..." : "Run Report"}
              </button>
            </>
          )}
        </div>

        {/* Right panel: results */}
        <div className="flex-1 min-w-0">

          {/* ── Saved Reports management view ── */}
          {viewSaved && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-slate-50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Saved Reports</p>
                  <p className="text-xs text-gray-400 mt-0.5">{savedReports.length} report{savedReports.length !== 1 ? "s" : ""} saved for this school</p>
                </div>
              </div>
              {savedReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-400 text-sm font-medium">No saved reports yet</p>
                  <p className="text-gray-300 text-xs mt-1">Build a report and click "Save Report" to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {savedReports.map(r => {
                    const cat = CATALOG.find(c => c.key === r.entity_key);
                    return (
                      <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 leading-snug">{r.report_name}</p>
                          {r.description && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{r.description}</p>}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-gray-400">{cat?.label ?? r.entity_key}</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">{r.selected_fields.length} field{r.selected_fields.length !== 1 ? "s" : ""}</span>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">Run {r.run_count}×</span>
                            {r.last_run_at && (
                              <>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs text-gray-400">{timeAgo(r.last_run_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => { loadReport(r); setViewSaved(false); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer border-none">
                            Load
                          </button>
                          <button
                            onClick={() => setShareTarget({ id: r.id, name: r.report_name })}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-1.5">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            Share
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(r.id)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-500 hover:bg-red-50 cursor-pointer">
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!viewSaved && !entity && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 border-dashed">
              <p className="text-gray-400 text-sm font-medium">Select a data source to get started</p>
              <p className="text-gray-300 text-xs mt-1">{savedReports.length > 0 ? "Or click Saved Reports to manage your reports" : "Choose from the list on the left"}</p>
            </div>
          )}

          {entity && !results && !running && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 border-dashed">
              <p className="text-gray-400 text-sm font-medium">
                {selectedFields.length === 0
                  ? "Select at least one field, then run the report"
                  : `${selectedFields.length} field${selectedFields.length !== 1 ? "s" : ""} selected · ${filters.length} filter${filters.length !== 1 ? "s" : ""} active`}
              </p>
              <p className="text-gray-300 text-xs mt-1">Click Run Report to see results</p>
            </div>
          )}

          {running && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Running report...</p>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-700 rounded-xl border border-red-200 px-5 py-4 text-sm mb-3"><strong>Query error:</strong> {error}</div>}

          {results && !running && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-slate-50">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{results.length} row{results.length !== 1 ? "s" : ""}</span>
                  {saveName && <span className="ml-2 text-xs text-gray-400">· {saveName}</span>}
                  {results.length === limit && <span className="ml-2 text-xs text-amber-600 font-medium">Limit reached — increase max rows</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSaveModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                    {activeReportId ? "Save Changes" : "Save Report"}
                  </button>
                  <button onClick={() => exportCSV(activeFieldDefs, results, entity!.label)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer border-none">
                    Export CSV
                  </button>
                </div>
              </div>

              {results.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No records match your filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-100">
                        {activeFieldDefs.map(f => (
                          <th key={f.key} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          {activeFieldDefs.map(f => (
                            <td key={f.key} className={cx("px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap", f.type === "boolean" ? (row[f.key] ? "text-teal-600 font-semibold" : "text-gray-400") : "")}>
                              {formatCell(row[f.key], f.type)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share modal — from header/results Save Changes button */}
      {shareModalOpen && activeReportId && schoolId && (
        <ShareReportModal
          reportId={activeReportId}
          reportName={saveName}
          schoolId={schoolId}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Share modal — from Saved Reports management panel */}
      {shareTarget && schoolId && (
        <ShareReportModal
          reportId={shareTarget.id}
          reportName={shareTarget.name}
          schoolId={schoolId}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Save modal */}
      {saveModalOpen && (
        <SaveModal initialName={saveName} initialDesc={saveDesc} isUpdate={!!activeReportId}
          saving={saving} onSave={handleSaveReport} onClose={() => setSaveModalOpen(false)} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 40 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, backgroundColor: "white", borderRadius: 16, padding: "24px", width: "min(380px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>Delete saved report?</p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              "{savedReports.find(r => r.id === deleteConfirm)?.report_name}" — this cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Cancel</button>
              <button onClick={() => handleDeleteReport(deleteConfirm)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportBuilder() {
  return (
    <RoleGuard allowedRoles={["admin", "finance"]}>
      <ReportBuilderInner />
    </RoleGuard>
  );
}
