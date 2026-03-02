"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Invoice, Student } from "../../../types";
import { useRouter } from "next/navigation";

export default function NewPacketPage() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [invoices, setInvoices] = useState<(Invoice & { students: Student })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function loadReadyInvoices() {
      // Fetch invoices that do NOT have a packet linked yet
      // This ensures we don't double-bundle the same invoice
      const { data: packets } = await supabase.from("esa_claim_packets").select("invoice_id");
      const bundledInvoiceIds = packets?.map(p => p.invoice_id) || [];

      const { data: invData } = await supabase
        .from("invoices")
        .select(`
          *,
          students (id, first_name, last_name, grade_level)
        `)
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .not("id", "in", `(${bundledInvoiceIds.join(",") || '00000000-0000-0000-0000-000000000000'})`)
        .order("issue_date", { ascending: false });

      if (invData) setInvoices(invData as any);
      setLoading(false);
    }
    loadReadyInvoices();
  }, []);

  async function generatePacket(invoiceId: string) {
    setIsSubmitting(true);
    setStatus("Bundling documents and locking audit trail...");

    try {
      const { data: newPacket, error } = await supabase
        .from("esa_claim_packets")
        .insert({
          school_id: PROTOTYPE_SCHOOL_ID,
          invoice_id: invoiceId,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      setStatus("Packet created successfully.");
      // Redirect to the review page we built earlier
      router.push(`/packets/${newPacket.id}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  }

  const containerStyle: React.CSSProperties = { padding: "40px", fontFamily: "system-ui" };
  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", marginTop: "20px" };
  const cellStyle: React.CSSProperties = { padding: "12px", borderBottom: "1px solid #eee" };

  if (loading) return <div style={containerStyle}>Finding invoices ready for bundling...</div>;

  return (
    <div style={containerStyle}>
      <h1>Generate Claim Packet</h1>
      <p style={{ opacity: 0.7 }}>Select an invoice to bundle it with student data and tutor credentials.</p>

      {invoices.length === 0 ? (
        <div style={{ marginTop: "30px", padding: "40px", textAlign: "center", border: "1px dashed #ccc", borderRadius: "8px" }}>
          <p>No new invoices found. Create an invoice first to generate a packet.</p>
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={{ textAlign: "left", backgroundColor: "#f8f9fa" }}>
              <th style={cellStyle}>Invoice #</th>
              <th style={cellStyle}>Student</th>
              <th style={cellStyle}>Grade</th>
              <th style={cellStyle}>Date</th>
              <th style={cellStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td style={cellStyle}>{inv.invoice_number}</td>
                <td style={cellStyle}>{inv.students.first_name} {inv.students.last_name}</td>
                <td style={cellStyle}>{inv.students.grade_level}</td>
                <td style={cellStyle}>{inv.issue_date}</td>
                <td style={cellStyle}>
                  <button 
                    disabled={isSubmitting}
                    onClick={() => generatePacket(inv.id)}
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#007bff", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "4px", 
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Generate Packet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {status && <p style={{ marginTop: "20px", fontWeight: 600, textAlign: "center" }}>{status}</p>}
    </div>
  );
}