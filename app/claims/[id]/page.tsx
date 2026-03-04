"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Packet = {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  student_id: string;
  students: { first_name: string; last_name: string; grade_level: string | null } | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number;
  status: string;
  invoice_line_items: { id: string; description: string; amount: number; service_date_start: string | null }[];
};

export default function ClaimsPacketDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [packet, setPacket] = useState<Packet | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: pkt } = await supabase
        .from("esa_claim_packets")
        .select("*, students(first_name, last_name, grade_level)")
        .eq("id", id)
        .single();

      if (!pkt) { setLoading(false); return; }
      setPacket(pkt as Packet);

      const { data: junction } = await supabase
        .from("claim_packet_invoices")
        .select("invoices(*, invoice_line_items(*))")
        .eq("claim_packet_id", id);

      if (junction) {
        const invs = junction.map((j: any) => j.invoices).filter(Boolean);
        setInvoices(invs as Invoice[]);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function markAsSubmitted() {
    if (!packet) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from("esa_claim_packets")
      .update({ status: "submitted" })
      .eq("id", id);

    if (error) {
      setStatusMessage("Error: " + error.message);
    } else {
      setPacket({ ...packet, status: "submitted" });
      setStatusMessage("Marked as submitted.");
    }
    setIsUpdating(false);
  }

  const grandTotal = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const quarterLabel = packet?.notes?.split(" — ")[0] ?? "";

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading claim packet...</p>
    </div>
  );

  if (!packet) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Claim packet not found.</p>
    </div>
  );

  const student = packet.students;

  return (
    <div id="print-area" className="px-4 py-8 sm:px-8 max-w-3xl mx-auto font-sans">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/claims/new")}
            className="print:hidden text-blue-500 font-semibold text-sm mb-3 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
          >
            ← Back to Claims
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Claim Packet — {quarterLabel}
          </h1>
          {student && (
            <p className="text-gray-500 text-sm">
              {student.first_name} {student.last_name}
              {student.grade_level ? ` · Grade ${student.grade_level}` : ""}
            </p>
          )}
        </div>
        <span className={cx(
          "self-start px-3 py-1 rounded-full text-xs font-bold uppercase",
          packet.status === "submitted" ? "bg-teal-50 text-teal-700" :
          packet.status === "approved" ? "bg-green-50 text-green-700" :
          packet.status === "rejected" ? "bg-red-50 text-red-700" :
          "bg-yellow-50 text-yellow-700"
        )}>
          {packet.status}
        </span>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            Included Invoices
            <span className="ml-2 text-xs font-normal text-gray-400">({invoices.length})</span>
          </h3>
          <span className="text-xl font-extrabold text-teal-700">${grandTotal.toFixed(2)}</span>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-400 text-sm px-5 py-4">No invoices linked to this packet.</p>
        ) : (
          <div className="flex flex-col">
            {invoices.map(inv => (
              <div key={inv.id} className="border-b border-gray-50 last:border-b-0">
                <button
                  onClick={() => router.push("/invoices/" + inv.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none text-left"
                >
                  <div>
                    <div className="font-semibold text-sm text-blue-600 hover:text-blue-800">{inv.invoice_number}</div>
                    <div className="text-xs text-gray-400">{inv.issue_date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cx(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      inv.status === "paid" ? "bg-green-50 text-green-700" :
                      inv.status === "draft" ? "bg-yellow-50 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    )}>
                      {inv.status}
                    </span>
                    <span className="font-bold text-sm text-gray-900">${Number(inv.total).toFixed(2)}</span>
                  </div>
                </button>

                <div className="border-t border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[360px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-100">
                          <th className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Date</th>
                          <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Description</th>
                          <th className="px-2 py-2 pr-5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inv.invoice_line_items || []).map(item => (
                          <tr key={item.id} className="border-b border-gray-50">
                            <td className="px-5 py-2 text-xs text-gray-600 whitespace-nowrap">{item.service_date_start ?? "—"}</td>
                            <td className="px-2 py-2 text-xs text-gray-700">{item.description}</td>
                            <td className="px-2 py-2 pr-5 text-xs font-semibold text-gray-900 text-right">${Number(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="print:hidden flex flex-col sm:flex-row gap-3">
        {packet.status === "draft" && (
          <button
            onClick={markAsSubmitted}
            disabled={isUpdating}
            className={cx(
              "flex-1 py-3 rounded-lg text-white text-sm font-bold transition-colors",
              isUpdating ? "bg-gray-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700 cursor-pointer"
            )}
          >
            {isUpdating ? "Saving..." : "Mark as Submitted"}
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="flex-1 py-3 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Print / Export PDF
        </button>
      </div>

      {statusMessage && (
        <div className={cx(
          "print:hidden mt-4 p-3 rounded-lg text-center text-sm font-semibold",
          statusMessage.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        )}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}
