"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Student, Invoice, ServiceLog } from "../../../types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function StudentDetailView() {
  const { id } = useParams();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*, invoice_line_items(*)")
        .eq("student_id", id)
        .order("issue_date", { ascending: false });

      const { data: logData } = await supabase
        .from("service_logs")
        .select("*, tutors(full_name)")
        .eq("student_id", id)
        .order("service_date", { ascending: false });

      if (studentData) {
        setStudent(studentData as Student);
        setGuardianName(studentData.guardian_name || "");
        setGuardianEmail(studentData.guardian_email || "");
      }
      if (invoiceData) setInvoices(invoiceData as any);
      if (logData) setLogs(logData as any);
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
      setUpdateMessage("Saved!");
      if (student) setStudent({ ...student, guardian_name: guardianName, guardian_email: guardianEmail });
    }
    setIsUpdating(false);
  }

  // Summary stats
  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const unbilledLogs = logs.filter(log => !log.invoice_line_item_id);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading student profile...</p>
    </div>
  );

  if (!student) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Student not found.</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-5xl mx-auto font-sans">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/students")}
            className="text-blue-500 font-semibold text-sm mb-3 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
          >
            ← Back to Roster
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {student.first_name} {student.last_name}
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={student.status === "active"
              ? "px-3 py-1 rounded-full text-xs font-bold uppercase bg-teal-50 text-teal-700"
              : "px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-500"
            }>
              {student.status}
            </span>
            <span className="text-gray-400 text-sm">Grade {student.grade_level}</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/students/" + id + "/edit")}
          className="w-full sm:w-auto px-5 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Edit Profile
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-extrabold text-gray-900">{totalHours}</div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Total Hours</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-extrabold text-teal-700">${totalBilled.toFixed(2)}</div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Total Billed</div>
        </div>
        <div className={cx(
          "rounded-xl border p-4 text-center",
          unbilledLogs.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-200"
        )}>
          <div className={cx("text-2xl font-extrabold", unbilledLogs.length > 0 ? "text-yellow-600" : "text-gray-900")}>
            {unbilledLogs.length}
          </div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Unbilled Logs</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-6">

        {/* Left Column */}
        <div className="flex flex-col gap-6">

          {/* Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
              <span className="text-xs text-gray-400">{invoices.length} total</span>
            </div>

            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm">No invoices generated yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {invoices.map((inv: any) => {
                  const isExpanded = expandedInvoiceId === inv.id;
                  return (
                    <div key={inv.id} className="border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className={isExpanded ? "text-blue-400 text-base transition-transform rotate-90 inline-block" : "text-gray-300 text-base inline-block"}>›</span>
                          <div>
                            <div className="font-bold text-sm text-gray-900">{inv.invoice_number}</div>
                            <div className="text-xs text-gray-400">{inv.issue_date} · {inv.invoice_line_items?.length || 0} line item{inv.invoice_line_items?.length !== 1 ? "s" : ""}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={inv.status === "paid"
                            ? "text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700"
                            : inv.status === "draft"
                            ? "text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700"
                            : "text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                          }>
                            {inv.status}
                          </span>
                          <span className="font-bold text-sm text-gray-900">${Number(inv.total).toFixed(2)}</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[400px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-gray-100">
                                  <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Date</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Description</th>
                                  <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Hrs</th>
                                  <th className="px-2 py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(inv.invoice_line_items || []).map((item: any) => (
                                  <tr key={item.id} className="border-b border-gray-50">
                                    <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">{item.service_date_start}</td>
                                    <td className="px-2 py-2 text-xs text-gray-700">{item.description}</td>
                                    <td className="px-2 py-2 text-xs text-gray-600 text-right">{item.quantity}</td>
                                    <td className="px-2 py-2 pr-4 text-xs font-semibold text-gray-900 text-right">${Number(item.amount).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-end px-4 py-2.5 bg-slate-50 border-t border-gray-100">
                            <span className="text-sm font-bold text-gray-900">Total: ${Number(inv.total).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Service Logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">Service Logs</h3>
              <span className="text-xs text-gray-400">{logs.length} total</span>
            </div>

            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">No service logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:-mx-6">
                <table className="w-full min-w-[480px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50">
                      <th className="px-5 sm:px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Date</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Description</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Tutor</th>
                      <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Hrs</th>
                      <th className="px-2 py-2.5 pr-5 sm:pr-6 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 sm:px-6 py-3 text-xs text-gray-600 whitespace-nowrap">{log.service_date}</td>
                        <td className="px-2 py-3 text-xs text-gray-700">{log.service_description}</td>
                        <td className="px-2 py-3 text-xs text-gray-500">{log.tutors?.full_name || "—"}</td>
                        <td className="px-2 py-3 text-xs text-gray-600 text-right">{log.hours}</td>
                        <td className="px-2 py-3 pr-5 sm:pr-6 text-right">
                          {log.invoice_line_item_id ? (
                            <span className="text-xs font-semibold text-teal-600">Billed</span>
                          ) : (
                            <span className="text-xs font-semibold text-yellow-600">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">

          {/* Guardian Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Guardian Info</h3>
            <form onSubmit={handleUpdateGuardian} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Contact Name</label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Email Address</label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={e => setGuardianEmail(e.target.value)}
                  placeholder="guardian@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isUpdating}
                className={cx(
                  "w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors mt-1",
                  isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700 cursor-pointer"
                )}
              >
                {isUpdating ? "Saving..." : "Save Contact Info"}
              </button>
              {updateMessage && (
                <div className={updateMessage.includes("Error")
                  ? "p-2 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700"
                  : "p-2 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700"
                }>
                  {updateMessage}
                </div>
              )}
            </form>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/logs/new")}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold transition-colors cursor-pointer border-none text-left"
              >
                + Log Service Hours
              </button>
              <button
                onClick={() => router.push("/claims/new")}
                className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors cursor-pointer border border-gray-300 text-left"
              >
                Generate Claim Packet
              </button>
            </div>
          </div>

          {/* Compliance Note */}
          <div className="bg-slate-50 rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Compliance Note</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              All tutoring logs must include an approved tutor credential to be valid for ClassWallet submission.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}