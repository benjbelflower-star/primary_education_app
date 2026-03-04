"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Invoice, Student } from "../../../types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function NewPacketPage() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<(Invoice & { students: Student })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      const sid = userData.school_id;
      setSchoolId(sid);

      const { data: packets } = await supabase.from("esa_claim_packets").select("invoice_id");
      const bundledIds = packets?.map(p => p.invoice_id) || [];

      const { data: invData } = await supabase
        .from("invoices")
        .select("*, students (id, first_name, last_name, grade_level)")
        .eq("school_id", sid)
        .not("id", "in", "(" + (bundledIds.join(",") || "00000000-0000-0000-0000-000000000000") + ")")
        .order("issue_date", { ascending: false });

      if (invData) setInvoices(invData as any);
      setLoading(false);
    }
    load();
  }, []);

  async function generatePacket(invoiceId: string) {
    if (!schoolId) return;
    setIsSubmitting(true);
    setStatus("Bundling documents and locking audit trail...");

    try {
      const { data: newPacket, error } = await supabase
        .from("esa_claim_packets")
        .insert({ school_id: schoolId, invoice_id: invoiceId, status: "draft" })
        .select()
        .single();

      if (error) throw error;
      setStatus("Packet created successfully.");
      router.push("/packets/" + newPacket.id);
    } catch (err: any) {
      setStatus("Error: " + err.message);
      setIsSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Finding invoices ready for bundling...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl mx-auto font-sans">
      <button
        onClick={() => router.push("/")}
        className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Generate Claim Packet</h1>
      <p className="text-gray-500 text-sm mb-6">Select an invoice to bundle it with student data and tutor credentials.</p>

      {invoices.length === 0 ? (
        <div className="mt-8 p-10 text-center border border-dashed border-gray-300 rounded-xl">
          <p className="text-gray-400 text-sm">No new invoices found. Create an invoice first to generate a packet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</th>
                <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-2 py-3 pr-5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-800">{inv.invoice_number}</td>
                  <td className="px-2 py-3 text-sm text-gray-800">{inv.students.first_name} {inv.students.last_name}</td>
                  <td className="px-2 py-3 text-sm text-gray-600">{inv.students.grade_level}</td>
                  <td className="px-2 py-3 text-sm text-gray-600">{inv.issue_date}</td>
                  <td className="px-2 py-3 pr-5 text-right">
                    <button
                      disabled={isSubmitting}
                      onClick={() => generatePacket(inv.id)}
                      className={cx("px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-colors", isSubmitting ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer")}
                    >
                      Generate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status && (
        <div className={status.includes("Error") ? "mt-4 p-3 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700" : "mt-4 p-3 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700"}>
          {status}
        </div>
      )}
    </div>
  );
}