"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { useRole } from "../../../contexts/RoleContext";
import RoleGuard from "../../../components/RoleGuard";

// ─── Report Catalog ───────────────────────────────────────────────────────────
// Defines every available data source and its selectable fields.
// Add new sources here as the SIS grows — no other code changes needed.

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
      { key: "staff_number",              label: "Staff Number",         type: "text" },
      { key: "first_name",                label: "First Name",           type: "text" },
      { key: "last_name",                 label: "Last Name",            type: "text" },
      { key: "email",                     label: "Email",                type: "text" },
      { key: "phone",                     label: "Phone",                type: "text" },
      { key: "role_type",                 label: "Role Type",            type: "text" },
      { key: "employment_status",         label: "Employment Status",    type: "text" },
      { key: "hire_date",                 label: "Hire Date",            type: "date" },
      { key: "end_date",                  label: "End Date",             type: "date" },
      { key: "credential_status",         label: "Credential Status",    type: "text" },
      { key: "credential_number",         label: "Credential Number",    type: "text" },
      { key: "background_check_status",   label: "Background Check",     type: "text" },
      { key: "background_check_date",     label: "Background Check Date",type: "date" },
      { key: "esa_provider_approved_flag",label: "ESA Approved",         type: "boolean" },
      { key: "active_flag",               label: "Active",               type: "boolean" },
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

type FilterRow = { id: string; field: string; op: FilterOp; value: string };

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
    { value: "eq",  label: "equals"         },
    { value: "gt",  label: "greater than"   },
    { value: "gte", label: "at least"       },
    { value: "lt",  label: "less than"      },
    { value: "lte", label: "at most"        },
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

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(fields: FieldDef[], rows: Record<string, unknown>[], entityLabel: string) {
  const headers = fields.map(f => f.label);
  const lines = [
    headers.map(h => `"${h}"`).join(","),
    ...rows.map(row =>
      fields.map(f => {
        const v = row[f.key];
        if (v === null || v === undefined) return "";
        if (typeof v === "boolean") return v ? "Yes" : "No";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entityLabel.toLowerCase().replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

  function selectEntity(e: EntityDef) {
    setEntity(e);
    setSelectedFields(e.defaultFields);
    setFilters([]);
    setResults(null);
    setError("");
    setSortField("");
  }

  function toggleField(key: string) {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function addFilter() {
    if (!entity) return;
    const first = entity.fields[0];
    setFilters(prev => [
      ...prev,
      { id: crypto.randomUUID(), field: first.key, op: opsFor(first.type)[0].value, value: "" },
    ]);
  }

  function updateFilter(id: string, patch: Partial<FilterRow>) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function removeFilter(id: string) {
    setFilters(prev => prev.filter(f => f.id !== id));
  }

  async function runReport() {
    if (!entity || !schoolId || selectedFields.length === 0) return;
    setRunning(true);
    setError("");
    setResults(null);

    try {
      const selectStr = ["school_id", ...selectedFields].join(", ");
      let query = supabase
        .from(entity.table)
        .select(selectStr)
        .eq("school_id", schoolId)
        .limit(limit);

      // Apply filters
      const noValueOps = new Set(["is_true","is_false","arr_is_empty","arr_not_empty"]);
      for (const f of filters) {
        const fieldDef = entity.fields.find(fd => fd.key === f.field);
        if (!fieldDef || (!f.value && !noValueOps.has(f.op))) continue;

        switch (f.op) {
          // Text
          case "contains":      query = query.ilike(f.field, `%${f.value}%`); break;
          case "not_contains":  query = query.not(f.field, "ilike", `%${f.value}%`); break;
          case "eq":            query = query.eq(f.field, f.value); break;
          case "not_eq":        query = query.neq(f.field, f.value); break;
          // Numeric / currency
          case "gt":            query = query.gt(f.field, f.value); break;
          case "gte":           query = query.gte(f.field, f.value); break;
          case "lt":            query = query.lt(f.field, f.value); break;
          case "lte":           query = query.lte(f.field, f.value); break;
          // Boolean
          case "is_true":       query = query.eq(f.field, true); break;
          case "is_false":      query = query.eq(f.field, false); break;
          // Date
          case "after":         query = query.gte(f.field, f.value); break;
          case "before":        query = query.lte(f.field, f.value); break;
          // Array (text[]) — uses Postgres @> and <@ operators via Supabase .contains / .not
          case "arr_includes":
            // field @> ARRAY[value] — array contains this classification
            query = query.contains(f.field, [f.value.trim()]);
            break;
          case "arr_excludes":
            // NOT (field @> ARRAY[value])
            query = query.not(f.field, "cs", `{${f.value.trim()}}`);
            break;
          case "arr_not_empty":
            // array is not empty: field <> '{}'
            query = query.neq(f.field, "{}");
            break;
          case "arr_is_empty":
            query = query.eq(f.field, "{}");
            break;
        }
      }

      // Sort
      if (sortField) {
        query = query.order(sortField, { ascending: sortDir === "asc" });
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      setResults((data ?? []) as unknown as Record<string, unknown>[]);
    } catch (e: any) {
      setError(e.message ?? "Query failed.");
    }
    setRunning(false);
  }

  const activeFieldDefs = entity?.fields.filter(f => selectedFields.includes(f.key)) ?? [];

  const inputClass =
    "px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-6xl mx-auto font-sans">

      {/* Header */}
      <button onClick={() => router.push("/reports")}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block">
        ← Back to Reports
      </button>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-400 mt-1">
          Select a data source, choose your fields, add filters, and export the results.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left panel: configuration ── */}
        <div className="flex flex-col gap-4 lg:w-80 shrink-0">

          {/* Step 1: Data source */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">1 — Data Source</p>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {CATALOG.map(e => (
                <button
                  key={e.key}
                  onClick={() => selectEntity(e)}
                  className={cx(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border",
                    entity?.key === e.key
                      ? "bg-slate-900 text-white border-slate-900 font-semibold"
                      : "bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <p className="font-semibold leading-tight">{e.label}</p>
                  <p className={cx("text-xs mt-0.5 leading-snug", entity?.key === e.key ? "text-slate-300" : "text-gray-400")}>
                    {e.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {entity && (
            <>
              {/* Step 2: Fields */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">2 — Fields</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedFields(entity.fields.map(f => f.key))}
                      className="text-xs text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer p-0">All</button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setSelectedFields(entity.defaultFields)}
                      className="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0">Default</button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => setSelectedFields([])}
                      className="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0">None</button>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {entity.fields.map(f => (
                    <label key={f.key}
                      className="flex items-center gap-2.5 px-1 py-1 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox"
                        checked={selectedFields.includes(f.key)}
                        onChange={() => toggleField(f.key)}
                        className="w-3.5 h-3.5 accent-slate-800 cursor-pointer" />
                      <span className="text-sm text-gray-700 leading-tight">{f.label}</span>
                      <span className="ml-auto text-xs text-gray-300 shrink-0">{f.type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Filters */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">3 — Filters</p>
                  <button onClick={addFilter}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer p-0">
                    + Add
                  </button>
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
                                const newField = entity.fields.find(f => f.key === e.target.value)!;
                                updateFilter(filter.id, {
                                  field: e.target.value,
                                  op: opsFor(newField.type)[0].value,
                                  value: "",
                                });
                              }}
                              className={inputClass + " flex-1 min-w-0"}>
                              {entity.fields.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </select>
                            <button onClick={() => removeFilter(filter.id)}
                              className="text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer text-lg leading-none shrink-0">
                              ×
                            </button>
                          </div>
                          <select value={filter.op}
                            onChange={e => updateFilter(filter.id, { op: e.target.value as FilterOp })}
                            className={inputClass + " w-full"}>
                            {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {needsValue && (
                            <input
                              type={fieldDef?.type === "date" ? "date" : "text"}
                              value={filter.value}
                              onChange={e => updateFilter(filter.id, { value: e.target.value })}
                              placeholder={
                                fieldDef?.type === "array"
                                  ? "e.g. ESE, ELL, Gifted"
                                  : "Value..."
                              }
                              className={inputClass + " w-full"} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 4: Sort + Limit */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">4 — Sort & Limit</p>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select value={sortField} onChange={e => setSortField(e.target.value)}
                      className={inputClass + " flex-1"}>
                      <option value="">— no sort —</option>
                      {entity.fields.filter(f => selectedFields.includes(f.key)).map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                    <select value={sortDir} onChange={e => setSortDir(e.target.value as "asc" | "desc")}
                      className={inputClass + " w-24"}>
                      <option value="asc">A → Z</option>
                      <option value="desc">Z → A</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 shrink-0">Max rows</label>
                    <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                      className={inputClass + " flex-1"}>
                      {[50, 100, 250, 500, 1000].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Run button */}
              <button
                onClick={runReport}
                disabled={running || selectedFields.length === 0}
                className={cx(
                  "w-full py-3 rounded-xl text-sm font-bold transition-colors border-none",
                  running || selectedFields.length === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-slate-900 text-white hover:bg-slate-700 cursor-pointer"
                )}>
                {running ? "Running report..." : "Run Report"}
              </button>
            </>
          )}
        </div>

        {/* ── Right panel: results ── */}
        <div className="flex-1 min-w-0">
          {!entity && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200 border-dashed">
              <p className="text-gray-400 text-sm font-medium">Select a data source to get started</p>
              <p className="text-gray-300 text-xs mt-1">Choose from the list on the left</p>
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

          {error && (
            <div className="bg-red-50 text-red-700 rounded-xl border border-red-200 px-5 py-4 text-sm">
              <strong>Query error:</strong> {error}
            </div>
          )}

          {results && !running && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Results header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-slate-50">
                <div>
                  <span className="text-sm font-semibold text-gray-900">
                    {results.length} row{results.length !== 1 ? "s" : ""}
                  </span>
                  {results.length === limit && (
                    <span className="ml-2 text-xs text-amber-600 font-medium">
                      Limit reached — increase max rows for more results
                    </span>
                  )}
                </div>
                <button
                  onClick={() => exportCSV(activeFieldDefs, results, entity!.label)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer border-none">
                  Export CSV
                </button>
              </div>

              {results.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">
                  No records match your filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-100">
                        {activeFieldDefs.map(f => (
                          <th key={f.key}
                            className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          {activeFieldDefs.map(f => (
                            <td key={f.key}
                              className={cx(
                                "px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap",
                                f.type === "boolean"
                                  ? row[f.key]
                                    ? "text-teal-600 font-semibold"
                                    : "text-gray-400"
                                  : ""
                              )}>
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
