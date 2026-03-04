"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type InvoiceDetail = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number;
  status: string;
  bill_to_name: string | null;
  student_display_name: string | null;
  student_grade_level: string | null;
  tutor_name: string | null;
  tutor_credential_type: string | null;
  tutoring_subject: string | null;
  invoice_line_items: {
    id: string;
    description: string;
    amount: number;
    service_date_start: string | null;
    service_date_end: string | null;
    esa_category: string | null;
  }[];
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data } = await supabase
        .from("invoices")
        .select("*, invoice_line_items(*)")
        .eq("id", id)
        .single();

      if (data) setInvoice(data as InvoiceDetail);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading invoice...</p>
    </div>
  );

  if (!invoice) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Invoice not found.</p>
    </div>
  );

  const lineItems = invoice.invoice_line_items ?? [];

  return (
    <div id="print-area" className="px-4 py-8 sm:px-8 max-w-3xl mx-auto font-sans">

      {/* Back + Print controls */}
      <div className="print:hidden flex justify-between items-center mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-500 font-semibold text-sm bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Print / Export PDF
        </button>
      </div>

      {/* Invoice Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{invoice.invoice_number}</h1>
            <p className="text-sm text-gray-500">Issued: {invoice.issue_date}</p>
          </div>
          <span className={cx(
            "self-start px-3 py-1 rounded-full text-xs font-bold uppercase",
            invoice.status === "paid" ? "bg-green-50 text-green-700" :
            invoice.status === "draft" ? "bg-yellow-50 text-yellow-700" :
            "bg-gray-100 text-gray-500"
          )}>
            {invoice.status}
          </span>
        </div>

        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {invoice.bill_to_name && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Billed To</div>
              <div className="text-gray-800">{invoice.bill_to_name}</div>
            </div>
          )}
          {invoice.student_display_name && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Student</div>
              <div className="text-gray-800">
                {invoice.student_display_name}
                {invoice.student_grade_level ? ` · Grade ${invoice.student_grade_level}` : ""}
              </div>
            </div>
          )}
          {invoice.tutor_name && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Provider</div>
              <div className="text-gray-800">{invoice.tutor_name}</div>
              {invoice.tutor_credential_type && (
                <div className="text-xs text-gray-400 mt-0.5">{invoice.tutor_credential_type}</div>
              )}
            </div>
          )}
          {invoice.tutoring_subject && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject</div>
              <div className="text-gray-800">{invoice.tutoring_subject}</div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
          <span className="text-xl font-extrabold text-teal-700">${Number(invoice.total).toFixed(2)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[360px]">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Date</th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Description</th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Category</th>
                <th className="px-2 py-2 pr-6 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">{item.service_date_start ?? "—"}</td>
                  <td className="px-2 py-3 text-sm text-gray-700">{item.description}</td>
                  <td className="px-2 py-3 text-sm text-gray-500">{item.esa_category ?? "—"}</td>
                  <td className="px-2 py-3 pr-6 text-sm font-semibold text-gray-900 text-right">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                <td className="px-2 py-3 pr-6 text-sm font-extrabold text-gray-900 text-right">${Number(invoice.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
