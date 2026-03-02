"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function ClaimPacketView() {
  const { id } = useParams();
  const router = useRouter();
  
  const [packet, setPacket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadPacketData() {
      if (!id) return;

      // We use a deeply nested Supabase query to pull all the related architectural entities at once
      const { data, error } = await supabase
        .from("claim_packets")
        .select(`
          id,
          status,
          created_at,
          invoices (
            invoice_number,
            issue_date,
            total,
            student_grade_level,
            students (first_name, last_name),
            tutors (full_name, credential_type),
            invoice_line_items (
              id,
              description,
              amount,
              esa_category,
              service_date_start
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        setErrorMsg(`Error loading packet: ${error.message}`);
      } else {
        setPacket(data);
      }
      setLoading(false);
    }
    loadPacketData();
  }, [id]);

  if (loading) return <div style={{ padding: 60 }}>Loading claim packet...</div>;
  if (errorMsg) return <div style={{ padding: 60, color: "red" }}>{errorMsg}</div>;
  if (!packet || !packet.invoices) return <div style={{ padding: 60 }}>Packet data is incomplete.</div>;

  const invoice = packet.invoices;
  const lineItems = invoice.invoice_line_items || [];

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginBottom: "24px"
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: "4px"
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: "#0f172a"
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui" }}>
      
      {/* Header Actions (Hidden when printing) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <button onClick={() => router.push("/claims/new")} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", padding: 0, fontWeight: 600 }}>
            ← Back to Claims
          </button>
        </div>
        <button 
          onClick={() => window.print()}
          style={{ padding: "10px 20px", backgroundColor: "#0f172a", color: "white", borderRadius: "6px", border: "none", fontWeight: 600, cursor: "pointer" }}
        >
          Print / Save PDF
        </button>
      </div>

      {/* The Printable Document */}
      <div id="printable-packet" style={{ backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", color: "#0f172a" }}>ESA Claim Summary</h1>
            <div style={{ color: "#64748b", fontSize: "14px" }}>Packet ID: {packet.id.slice(0, 8)}...</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...labelStyle, marginBottom: "0" }}>Status</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: packet.status === "Draft" ? "#ca8a04" : "#16a34a", textTransform: "uppercase" }}>
              {packet.status}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Student Details</h3>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>Student Name</div>
              <div style={valueStyle}>{invoice.students?.first_name} {invoice.students?.last_name}</div>
            </div>
            <div>
              <div style={labelStyle}>Grade Level at Time of Service</div>
              <div style={valueStyle}>{invoice.student_grade_level}</div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Provider Details</h3>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>Tutor / Provider</div>
              <div style={valueStyle}>{invoice.tutors?.full_name}</div>
            </div>
            <div>
              <div style={labelStyle}>Credential on File</div>
              <div style={valueStyle}>{invoice.tutors?.credential_type}</div>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={{ marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", display: "flex", justifyContent: "space-between" }}>
            <span>Service Breakdown</span>
            <span>Invoice: {invoice.invoice_number}</span>
          </h3>
          
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 8px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Date</th>
                <th style={{ padding: "12px 8px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>ESA Category</th>
                <th style={{ padding: "12px 8px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Description</th>
                <th style={{ padding: "12px 8px", color: "#64748b", fontSize: "13px", textTransform: "uppercase", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 8px", fontSize: "14px" }}>{item.service_date_start}</td>
                  <td style={{ padding: "12px 8px", fontSize: "14px", fontWeight: 600 }}>{item.esa_category}</td>
                  <td style={{ padding: "12px 8px", fontSize: "14px", color: "#475569" }}>{item.description}</td>
                  <td style={{ padding: "12px 8px", fontSize: "14px", textAlign: "right", fontWeight: 600 }}>${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px", paddingTop: "20px", borderTop: "2px solid #e2e8f0" }}>
            <div style={{ textAlign: "right" }}>
              <div style={labelStyle}>ClassWallet Transaction Total</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>
                ${invoice.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", marginTop: "40px" }}>
          Generated by Primary Education Operations System • {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Basic Print Styling injected directly into the component */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-packet, #printable-packet * { visibility: visible; }
          #printable-packet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; padding: 0; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}