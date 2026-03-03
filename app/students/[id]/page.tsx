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

  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    async function loadStudentData() {
      if (!id) return;

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*")
        .eq("student_id", id)
        .order("issue_date", { ascending: false });

      const { data: logData } = await supabase
        .from("service_logs")
        .select("*")
        .eq("student_id", id)
        .order("service_date", { ascending: false });

      if (studentData) {
        setStudent(studentData as Student);
        setGuardianName(studentData.guardian_name || "");
        setGuardianEmail(studentData.guardian_email || "");
      }
      if (invoiceData) setInvoices(invoiceData as Invoice[]);
      if (logData) setLogs(logData as ServiceLog[]);
      setLoading(false);
    }
    loadStudentData();
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
      if (student) {
        setStudent({ ...student, guardian_name: guardianName, guardian_email: guardianEmail });
      }
    }
    setIsUpdating(false);
  }

  function getStatusBadgeClass(status: string) {
    if (status === "active") return "px-3 py-1 rounded-full text-xs font-bold uppercase bg-teal-50 text-teal-700";
    return "px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-600";
  }

  function getUpdateMessageClass(msg: string) {
    if (msg.includes("Error")) return "mt-3 p-2 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700";
    return "mt-3 p-2 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700";
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

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-5xl mx-auto font-sans">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {student.first_name} {student.last_name}
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={getStatusBadgeClass(student.status)}>
              Status: {student.status}
            </span>
            <span className="text-gray-500 text-sm">Grade {student.grade_level}</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/students/" + id + "/edit")}
          className="w-full sm:w-auto px-5 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Edit Profile
        </button>
      </div>

      {/* Main grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-6">

        {/* Left Column */}
        <div className="flex flex-col gap-6">

          {/* Service History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Service History</h3>
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

          {/* Billing History */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Billing History</h3>
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm">No invoices generated yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex justify-between items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
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
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">

          {/* Guardian Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Guardian Info</h3>
            <form onSubmit={handleUpdateGuardian} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                  Primary Contact Name
                </label>
                <input
                  type="text"
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                  Email Address
                </label>
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
                <div className={getUpdateMessageClass(updateMessage)}>
                  {updateMessage}
                </div>
              )}
            </form>
          </div>

          {/* Compliance Note */}
          <div className="bg-slate-50 rounded-xl border border-gray-200 p-5 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Compliance Note</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              This student is enrolled in the ESA program. All tutoring logs must include an approved tutor credential to be valid for ClassWallet submission.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}