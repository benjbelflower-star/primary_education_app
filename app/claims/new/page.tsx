"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Student = { id: string; first_name: string; last_name: string; };
type Invoice = { id: string; invoice_number: string; issue_date: string; total: number; notes: string; };

function getQuarters() {
  const quarters = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - (i * 3), 1);
    const q = Math.floor(date.getMonth() / 3) + 1;
    const year = date.getFullYear();
    const startMonth = (q - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    quarters.push({
      label: "Q" + q + " " + year,
      value: "Q" + q + "-" + year,
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      q,
      year,
    });
  }
  return quarters;
}

export default function NewClaimPacket() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const quarters = getQuarters();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      setSchoolId(userData.school_id);

      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("school_id", userData.school_id)
        .eq("status", "active")
        .order("last_name");

      if (data) setStudents(data as Student[]);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadPreview() {
      if (!selectedStudentId || !selectedQuarter || !schoolId) {
        setPreviewInvoices([]);
        return;
      }

      setIsLoadingPreview(true);
      const quarter = quarters.find(q => q.value === selectedQuarter);
      if (!quarter) return;

      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, total, notes")
        .eq("school_id", schoolId)
        .eq("student_id", selectedStudentId)
        .gte("issue_date", quarter.start)
        .lte("issue_date", quarter.end)
        .order("issue_date");

      setPreviewInvoices((data as Invoice[]) || []);
      setIsLoadingPreview(false);
    }
    loadPreview();
  }, [selectedStudentId, selectedQuarter, schoolId]);

  const grandTotal = previewInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const quarterLabel = quarters.find(q => q.value === selectedQuarter)?.label || "";

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !selectedStudentId || !selectedQuarter || previewInvoices.length === 0) return;

    setIsSubmitting(true);
    setStatusMessage("Assembling claim packet...");

    try {
      const quarter = quarters.find(q => q.value === selectedQuarter);

      const { data: packet, error: packetError } = await supabase
        .from("esa_claim_packets")
        .insert({
          school_id: schoolId,
          student_id: selectedStudentId,
          status: "draft",
          notes: quarterLabel + " — " + previewInvoices.length + " invoices — $" + grandTotal.toFixed(2),
        })
        .select()
        .single();

      if (packetError) throw packetError;

      const junctionRows = previewInvoices.map(inv => ({
        claim_packet_id: packet.id,
        invoice_id: inv.id,
      }));

      const { error: junctionError } = await supabase
        .from("claim_packet_invoices")
        .insert(junctionRows);

      if (junctionError) throw junctionError;

      setStatusMessage("Packet created successfully!");
      setTimeout(() => router.push("/claims/" + packet.id), 1200);

    } catch (err: any) {
      setStatusMessage("Error: " + err.message);
      setIsSubmitting(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New Claim Packet</h1>
      <p className="text-gray-500 text-sm mb-8">Select a student and quarter to bundle invoices for state submission.</p>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-8">

        <form onSubmit={handleGenerate} className="flex flex-col gap-5">
          <div>
            <label className={labelClass}>Student</label>
            <select required value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className={inputClass}>
              <option value="">Select student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Quarter</label>
            <select required value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} className={inputClass}>
              <option value="">Select quarter...</option>
              {quarters.map(q => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || previewInvoices.length === 0}
            className={cx(
              "w-full py-3 rounded-lg text-white text-sm font-bold transition-colors",
              previewInvoices.length > 0 && !isSubmitting
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            {isSubmitting ? "Assembling..." : "Generate Packet — " + previewInvoices.length + " Invoice" + (previewInvoices.length === 1 ? "" : "s")}
          </button>

          {statusMessage && (
            <div className={statusMessage.includes("Error") ? "p-3 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700" : "p-3 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700"}>
              {statusMessage}
            </div>
          )}
        </form>

        <div className="bg-slate-50 rounded-xl border border-gray-200 p-5 h-fit">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Packet Preview</h3>

          {!selectedStudentId || !selectedQuarter ? (
            <p className="text-sm text-gray-400 text-center my-8">Select a student and quarter to preview.</p>
          ) : isLoadingPreview ? (
            <p className="text-sm text-gray-400 text-center my-8">Loading invoices...</p>
          ) : previewInvoices.length === 0 ? (
            <p className="text-sm text-red-400 text-center my-8">No invoices found for this student in {quarterLabel}.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">{selectedStudent?.first_name} {selectedStudent?.last_name} — {quarterLabel}</div>
              {previewInvoices.map(inv => (
                <div key={inv.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-700 font-medium">{inv.invoice_number}</span>
                  <span className="text-gray-500">{inv.issue_date}</span>
                  <span className="font-semibold text-gray-900">${Number(inv.total).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-1">
                <span className="text-sm font-bold text-gray-700">Total</span>
                <span className="text-xl font-extrabold text-teal-700">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}