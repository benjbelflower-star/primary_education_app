"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Packet = { id: string; status: string; notes: string; created_at: string; student_id: string; };
type Student = { id: string; first_name: string; last_name: string; grade_level: string; };
type LineItem = { id: string; description: string; quantity: number; unit_price: number; amount: number; service_date_start: string; esa_category: string; };
type Invoice = { id: string; invoice_number: string; issue_date: string; total: number; notes: string; line_items: LineItem[]; };

export default function ClaimPacketReview() {
  const { id } = useParams();
  const router = useRouter();

  const [packet, setPacket] = useState<Packet | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: pkt } = await supabase
        .from("esa_claim_packets")
        .select("*")
        .eq("id", id)
        .single();

      if (!pkt) { setLoading(false); return; }
      setPacket(pkt as Packet);

      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade_level")
        .eq("id", pkt.student_id)
        .single();

      if (studentData) setStudent(studentData as Student);

      const { data: junctionData } = await supabase
        .from("claim_packet_invoices")
        .select("invoice_id")
        .eq("claim_packet_id", id);

      if (!junctionData || junctionData.length === 0) { setLoading(false); return; }

      const invoiceIds = junctionData.map(j => j.invoice_id);

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, total, notes")
        .in("id", invoiceIds)
        .order("issue_date");

      if (invoiceData) {
        const withLineItems = await Promise.all(
          invoiceData.map(async inv => {
            const { data: items } = await supabase
              .from("invoice_line_items")
              .select("id, description, quantity, unit_price, amount, service_date_start, esa_category")
              .eq("invoice_id", inv.id)
              .order("service_date_start");
            return { ...inv, line_items: items || [] };
          })
        );
        setInvoices(withLineItems as Invoice[]);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function markAsSubmitted() {
    if (!packet) return;
    setIsUpdating(true);
    await supabase
      .from("esa_claim_packets")
      .update({ status: "submitted", submission_date: new Date().toISOString().split("T")[0] })
      .eq("id", packet.id);
    setPacket({ ...packet, status: "submitted" });
    setIsUpdating(false);
  }

  const grandTotal = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading claim packet...</p>
    </div>
  );

  if (!packet) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Packet not found.</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl mx-auto font-sans">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 print:hidden">
        <button
          onClick={() => router.push("/claims/new")}
          className="text-blue-500 font-semibold text-sm bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors"
        >
          Back to Claims
        </button>
        <div className="flex gap-3">
          {packet.status === "draft" && (
            <button
              onClick={markAsSubmitted}
              disabled={isUpdating}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
            >
              {isUpdating ? "Updating..." : "Mark as Submitted"}
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
          >
            Print / Download
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">ESA Claim Packet</h1>
            <p className="text-gray-500 text-sm">{packet.notes}</p>
          </div>
          <span className={packet.status === "submitted"
            ? "mt-3 sm:mt-0 px-3 py-1 rounded-full text-xs font-bold uppercase bg-teal-50 text-teal-700"
            : "mt-3 sm:mt-0 px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-50 text-yellow-700"
          }>
            {packet.status}
          </span>
        </div>

        <div className="mb-8">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Student Information</div>
          <div className="text-gray-900 font-semibold">{student?.first_name} {student?.last_name}</div>
          <div className="text-gray-500 text-sm">Grade {student?.grade_level}</div>
        </div>

        <div className="mb-8">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Invoices</div>
          <div className="flex flex-col gap-6">
            {invoices.map(inv => (
              <div key={inv.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-gray-100">
                  <div>
                    <span className="font-bold text-gray-900 text-sm">{inv.invoice_number}</span>
                    <span className="text-gray-400 text-xs ml-3">{inv.issue_date}</span>
                  </div>
                  <span className="font-bold text-gray-900">${Number(inv.total).toFixed(2)}</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Hrs</th>
                      <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Rate</th>
                      <th className="px-2 py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.line_items.map(item => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">{item.service_date_start}</td>
                        <td className="px-2 py-2 text-xs text-gray-700">{item.description}</td>
                        <td className="px-2 py-2 text-xs text-gray-600 text-right">{item.quantity}</td>
                        <td className="px-2 py-2 text-xs text-gray-600 text-right">${Number(item.unit_price).toFixed(2)}</td>
                        <td className="px-2 py-2 pr-4 text-xs font-semibold text-gray-900 text-right">${Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t-2 border-gray-200">
          <span className="font-bold text-gray-900">Grand Total</span>
          <span className="text-3xl font-extrabold text-teal-700">${grandTotal.toFixed(2)}</span>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center print:block">
          Generated {new Date(packet.created_at).toLocaleDateString()} — Arizona ESA Program
        </div>

      </div>
    </div>
  );
}