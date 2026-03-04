"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import ClassWalletSummary from "../../../components/ClassWalletSummary";
import { Invoice, Tutor, ServiceLog, ClaimPacket, Student, InvoiceLineItem } from "../../../types";

export default function PacketReviewPage() {
  const { id } = useParams();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [packet, setPacket] = useState<ClaimPacket | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPacketData() {
      if (!id) return;

      // 1. Fetch Packet
      const { data: pkt } = await supabase.from("esa_claim_packets").select("*").eq("id", id).single();
      if (!pkt) return setLoading(false);
      setPacket(pkt as ClaimPacket);

      // 2. Fetch Invoice and linked Tutor/Student data
      const { data: inv } = await supabase
        .from("invoices")
        .select(`
          *,
          tutors (*),
          students (id, first_name, last_name, grade_level)
        `)
        .eq("id", pkt.invoice_id)
        .single();

      if (inv) {
        setInvoice(inv as unknown as Invoice);
        setTutor(inv.tutors as unknown as Tutor);
        setStudent(inv.students as unknown as Student);

        // 3. Fetch Line Items
        const { data: items } = await supabase
          .from("invoice_line_items")
          .select("*")
          .eq("invoice_id", inv.id);
        
        if (items) {
          setLineItems(items as InvoiceLineItem[]);
          const itemIds = items.map(i => i.id);

          // 4. Fetch Linked Service Logs
          const { data: sLogs } = await supabase
            .from("service_logs")
            .select("*")
            .in("invoice_line_item_id", itemIds);
          
          if (sLogs) setLogs(sLogs as ServiceLog[]);
        }
      }
      setLoading(false);
    }
    loadPacketData();
  }, [id]);

  const containerStyle: React.CSSProperties = {
    padding: "40px",
    maxWidth: "1000px",
    margin: "0 auto",
    fontFamily: "system-ui"
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px"
  };

  if (loading) return <div style={containerStyle}>Loading audit trail...</div>;
  if (!packet || !invoice) return <div style={containerStyle}>Packet not found.</div>;

  return (
    <div id="print-area" style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "30px" }}>
        <h1>Claim Packet Review</h1>
        <span style={{ 
          padding: "4px 12px", 
          borderRadius: "20px", 
          backgroundColor: "#e3f2fd", 
          color: "#0d47a1", 
          fontWeight: 600,
          textTransform: "uppercase",
          fontSize: "12px"
        }}>
          Status: {packet.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Left Column: Visual Compliance Check */}
        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Invoice & Summary</h3>
            <p style={{ fontSize: "14px", color: "#666" }}>
              This is the visual summary parents will use to fill out ClassWallet fields.
            </p>
            <div style={{ border: "1px solid #eee", borderRadius: "4px", marginTop: "15px" }}>
              <ClassWalletSummary invoice={invoice} tutor={tutor} />
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Verified Service Logs</h3>
            {logs.map(log => (
              <div key={log.id} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}>
                <div style={{ fontWeight: 600 }}>{log.service_date}</div>
                <div style={{ fontSize: "14px" }}>{log.service_description}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>{log.hours} hours logged</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Document & Audit Sidebar */}
        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Student Info</h3>
            <div style={{ fontSize: "15px" }}>
              <strong>{student?.first_name} {student?.last_name}</strong>
              <div style={{ opacity: 0.8 }}>Grade: {student?.grade_level}</div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Tutor Credentials</h3>
            {tutor?.credential_url ? (
              <div>
                <div style={{ fontSize: "14px", marginBottom: "10px" }}>{tutor.full_name}</div>
                <a 
                  href={tutor.credential_url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ 
                    display: "block", 
                    textAlign: "center", 
                    padding: "10px", 
                    backgroundColor: "#f8f9fa", 
                    border: "1px solid #ccc", 
                    borderRadius: "4px",
                    textDecoration: "none",
                    color: "#333",
                    fontWeight: 600
                  }}
                >
                  View Credential PDF
                </a>
              </div>
            ) : (
              <div style={{ color: "#b00020", fontSize: "14px" }}>No credential document on file.</div>
            )}
          </div>

          <button 
            onClick={() => window.print()}
            style={{ 
              width: "100%", 
              padding: "14px", 
              backgroundColor: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "6px", 
              fontWeight: 700, 
              cursor: "pointer" 
            }}
          >
            Download/Print Packet
          </button>
        </div>
      </div>
    </div>
  );
}