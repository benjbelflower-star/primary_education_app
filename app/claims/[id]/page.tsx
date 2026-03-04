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
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
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

  function printInvoice(inv: Invoice) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const lineItemRows = inv.line_items.map(item => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #374151;">${item.service_date_start}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #374151;">${item.description}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #374151; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #374151; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">$${Number(item.amount).toFixed(2)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${inv.invoice_number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; padding: 48px; color: #111827; }
            h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #6b7280; margin-bottom: 32px; }
            .student { margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
            .student-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
            .student-name { font-size: 16px; font-weight: 700; color: #111827; }
            .student-grade { font-size: 13px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            thead tr { background: #f8fafc; border-bottom: 2px solid #e5e7eb; }
            th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; text-align: left; }
            th.right { text-align: right; }
            .total-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 12px; border-top: 2px solid #111827; margin-top: 8px; }
            .total-label { font-size: 15px; font-weight: 700; }
            .total-amount { font-size: 28px; font-weight: 800; color: #0d9488; }
            .footer { margin-top: 48px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
          </style>
        </head>
        <body>
          <h1>Invoice ${inv.invoice_number}</h1>
          <div class="meta">Issued: ${inv.issue_date} &nbsp;·&nbsp; ${inv.notes || ""}</div>

          <div class="student">
            <div class="student-label">Student</div>
            <div class="student-name">${student?.first_name} ${student?.last_name}</div>
            <div class="student-grade">Grade ${student?.grade_level}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th class="right">Hrs</th>
                <th class="right">Rate</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>${lineItemRows}</tbody>
          </table>

          <div class="total-row">
            <span class="total-label">Invoice Total</span>
            <span class="total-amount">$${Number(inv.total).toFixed(2)}</span>
          </div>

          <div class="footer">Arizona ESA Program &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString()}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }

  function printFullPacket() {
    const allInvoiceHtml = invoices.map(inv => {
      const rows = inv.line_items.map(item => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${item.service_date_start}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${item.description}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right;">${item.quantity}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right;">$${Number(item.unit_price).toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right;">$${Number(item.amount).toFixed(2)}</td>
        </tr>
      `).join("");

      return `
        <div style="margin-bottom: 32px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px 8px 0 0; border: 1px solid #e5e7eb; border-bottom: none;">
            <div>
              <span style="font-weight: 700; font-size: 15px;">${inv.invoice_number}</span>
              <span style="font-size: 12px; color: #6b7280; margin-left: 12px;">${inv.issue_date}</span>
            </div>
            <span style="font-weight: 700; font-size: 15px;">$${Number(inv.total).toFixed(2)}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; text-align: left;">Date</th>
                <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; text-align: left;">Description</th>
                <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; text-align: right;">Hrs</th>
                <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; text-align: right;">Rate</th>
                <th style="padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Claim Packet — ${packet?.notes}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; padding: 48px; color: #111827; }
            h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
            .student { margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
            .student-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
            .student-name { font-size: 16px; font-weight: 700; }
            .total-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-top: 2px solid #111827; margin-top: 16px; }
            .total-label { font-size: 16px; font-weight: 700; }
            .total-amount { font-size: 32px; font-weight: 800; color: #0d9488; }
            .footer { margin-top: 48px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
          </style>
        </head>
        <body>
          <h1>ESA Claim Packet</h1>
          <div class="meta">${packet?.notes}</div>
          <div class="meta">Status: ${packet?.status} &nbsp;·&nbsp; Generated ${new Date(packet?.created_at || "").toLocaleDateString()}</div>

          <div class="student">
            <div class="student-label">Student</div>
            <div class="student-name">${student?.first_name} ${student?.last_name}</div>
            <div style="font-size: 13px; color: #6b7280;">Grade ${student?.grade_level}</div>
          </div>

          ${allInvoiceHtml}

          <div class="total-row">
            <span class="total-label">Grand Total</span>
            <span class="total-amount">$${invoices.reduce((sum, inv) => sum + Number(inv.total), 0).toFixed(2)}</span>
          </div>

          <div class="footer">Arizona ESA Program &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString()}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <button
          onClick={() => router.push("/claims/new")}
          className="text-blue-500 font-semibold text-sm bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors w-fit"
        >
          ← Back to Claims
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
            onClick={printFullPacket}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none"
          >
            Print Full Packet
          </button>
        </div>
      </div>

      {/* Packet Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">ESA Claim Packet</h1>
            <p className="text-gray-500 text-sm">{packet.notes}</p>
            <p className="text-gray-400 text-xs mt-1">Created {new Date(packet.created_at).toLocaleDateString()}</p>
          </div>
          <span className={packet.status === "submitted"
            ? "px-3 py-1 rounded-full text-xs font-bold uppercase bg-teal-50 text-teal-700 w-fit"
            : "px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-50 text-yellow-700 w-fit"
          }>
            {packet.status}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Student</div>
          <div className="font-semibold text-gray-900">{student?.first_name} {student?.last_name}</div>
          <div className="text-sm text-gray-500">Grade {student?.grade_level}</div>
        </div>
      </div>

      {/* Invoice Cards */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
          {invoices.length} Invoice{invoices.length !== 1 ? "s" : ""} in this packet
        </div>

        {invoices.map(inv => {
          const isExpanded = expandedInvoiceId === inv.id;
          return (
            <div key={inv.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

              {/* Invoice Row — clickable header */}
              <button
                onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none text-left"
              >
                <div className="flex items-center gap-4">
                  <span className={isExpanded ? "text-blue-500 text-lg transition-transform rotate-90" : "text-gray-400 text-lg transition-transform"}>›</span>
                  <div>
                    <div className="font-bold text-gray-900">{inv.invoice_number}</div>
                    <div className="text-xs text-gray-400">{inv.issue_date} · {inv.line_items.length} line item{inv.line_items.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-900">${Number(inv.total).toFixed(2)}</span>
                </div>
              </button>

              {/* Expanded line items */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-100">
                          <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Date</th>
                          <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Description</th>
                          <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Hrs</th>
                          <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Rate</th>
                          <th className="px-2 py-2.5 pr-5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.line_items.map(item => (
                          <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">{item.service_date_start}</td>
                            <td className="px-2 py-3 text-xs text-gray-700">{item.description}</td>
                            <td className="px-2 py-3 text-xs text-gray-600 text-right">{item.quantity}</td>
                            <td className="px-2 py-3 text-xs text-gray-600 text-right">${Number(item.unit_price).toFixed(2)}</td>
                            <td className="px-2 py-3 pr-5 text-xs font-semibold text-gray-900 text-right">${Number(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Invoice footer with print button */}
                  <div className="flex justify-between items-center px-5 py-3 bg-slate-50 border-t border-gray-100">
                    <button
                      onClick={() => printInvoice(inv)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer p-0 transition-colors"
                    >
                      Print this invoice →
                    </button>
                    <span className="text-sm font-bold text-gray-900">
                      Invoice Total: ${Number(inv.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Total */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 flex justify-between items-center">
        <span className="font-bold text-gray-900">Grand Total</span>
        <span className="text-3xl font-extrabold text-teal-700">${grandTotal.toFixed(2)}</span>
      </div>

    </div>
  );
}