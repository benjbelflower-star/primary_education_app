"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type InvoicePreview = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number;
  students: { first_name: string; last_name: string; grade_level: string };
  tutors: { full_name: string; credential_type: string };
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function NewClaimPacket() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [availableInvoices, setAvailableInvoices] = useState<InvoicePreview[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      const sid = userData.school_id;
      setSchoolId(sid);

      const { data: existingPackets } = await supabase.from("claim_packets").select("invoice_id");
      const usedInvoiceIds = existingPackets?.map(p => p.invoice_id) || [];

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, total, students (first_name, last_name, grade_level), tutors (full_name, credential_type)")
        .eq("school_id", sid)
        .order("issue_date", { ascending: false });

      if (data && !error) {
        setAvailableInvoices((data as any[]).filter(inv => !usedInvoiceIds.includes(inv.id)));
      }
    }
    load();
  }, []);

  const selectedInvoice = availableInvoices.find(inv => inv.id === selectedInvoiceId);

  async function handleGeneratePacket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoiceId || !schoolId) return;
    setIsSubmitting(true);
    setStatusMessage("Assembling Claim Packet...");

    try {
      const { data: packet, error: packetError } = await supabase
        .from("claim_packets")
        .insert({ school_id: schoolId, invoice_id: selectedInvoiceId, status: "Draft", submission_date: null })
        .select()
        .single();

      if (packetError) throw packetError;
      setStatusMessage("Claim Packet assembled successfully!");
      setTimeout(() => router.push("/claims/" + packet.id), 1500);
    } catch (err: any) {
      setStatusMessage("Error: " + err.message);
      setIsSubmitting(false);
    }
  }

  function getStatusClass(msg: string) {
    if (msg.includes("Error")) return "p-4 rounded-lg text-center font-semibold text-sm border bg-red-50 text-red-700 border-red-200";
    return "p-4 rounded-lg text-center font-semibold text-sm border bg-teal-50 text-teal-700 border-teal-200";
  }

  const inputClass = "w-full px-3 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Assemble ESA Claim Packet</h1>
      <p className="text-gray-500 text-sm mb-8">Select a generated invoice to bundle with tutor credentials and service logs for state submission.</p>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-8">
        <form onSubmit={handleGeneratePacket} className="flex flex-col gap-6">
          <div>
            <label className={labelClass}>Select Generated Invoice</label>
            <select required value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)} className={inputClass}>
              <option value="">Choose an invoice...</option>
              {availableInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} - {inv.students?.first_name} {inv.students?.last_name} (${inv.total})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedInvoiceId}
            className={cx(
              "w-full py-3 rounded-lg text-white text-sm font-bold transition-colors",
              selectedInvoiceId && !isSubmitting ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" : "bg-gray-300 cursor-not-allowed"
            )}
          >
            {isSubmitting ? "Assembling..." : "Generate Packet"}
          </button>

          {statusMessage && <div className={getStatusClass(statusMessage)}>{statusMessage}</div>}
        </form>

        <div className="bg-slate-50 rounded-xl border border-gray-200 p-5 h-fit">
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Packet Preview</h3>
          {selectedInvoice ? (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Student</div>
                <div className="font-semibold text-gray-900">{selectedInvoice.students?.first_name} {selectedInvoice.students?.last_name}</div>
                <div className="text-sm text-slate-500">Grade {selectedInvoice.students?.grade_level}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Provider / Tutor</div>
                <div className="font-semibold text-gray-900">{selectedInvoice.tutors?.full_name}</div>
                <div className="text-sm text-slate-500">{selectedInvoice.tutors?.credential_type}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Financials</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-700">{selectedInvoice.invoice_number}</span>
                  <span className="font-extrabold text-xl text-teal-700">${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center my-10">Select an invoice to preview packet details.</p>
          )}
        </div>
      </div>
    </div>
  );
}