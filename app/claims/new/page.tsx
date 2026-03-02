"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

// Define local types for the complex join
type InvoicePreview = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number;
  students: { first_name: string; last_name: string; grade_level: string };
  tutors: { full_name: string; credential_type: string };
};

export default function NewClaimPacket() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [availableInvoices, setAvailableInvoices] = useState<InvoicePreview[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Load invoices that do not yet have a claim packet
  useEffect(() => {
    async function loadInvoices() {
      // Step 1: Find all invoice IDs that already exist in the claim_packets table
      const { data: existingPackets } = await supabase
        .from("claim_packets")
        .select("invoice_id");
        
      const usedInvoiceIds = existingPackets?.map(p => p.invoice_id) || [];

      // Step 2: Fetch invoices, filtering out the ones already used
      let query = supabase
        .from("invoices")
        .select(`
          id, 
          invoice_number, 
          issue_date, 
          total,
          students (first_name, last_name, grade_level),
          tutors (full_name, credential_type)
        `)
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("issue_date", { ascending: false });

      const { data, error } = await query;

      if (data && !error) {
        // Filter out invoices that already have packets
        const unusedInvoices = (data as any[]).filter(inv => !usedInvoiceIds.includes(inv.id));
        setAvailableInvoices(unusedInvoices);
      }
    }
    loadInvoices();
  }, []);

  const selectedInvoice = availableInvoices.find(inv => inv.id === selectedInvoiceId);

  async function handleGeneratePacket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    setIsSubmitting(true);
    setStatusMessage("Assembling Claim Packet...");

    try {
      // Insert the new claim packet record
      const { data: packet, error: packetError } = await supabase
        .from("claim_packets")
        .insert({
          school_id: PROTOTYPE_SCHOOL_ID,
          invoice_id: selectedInvoiceId,
          status: "Draft",
          submission_date: null
        })
        .select()
        .single();

      if (packetError) throw packetError;

      setStatusMessage("Claim Packet assembled successfully!");
      // Redirect to the packet view (which we will build next)
      setTimeout(() => router.push(`/claims/${packet.id}`), 1500);

    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "14px", display: "block", marginBottom: "4px" };
  const selectStyle: React.CSSProperties = { padding: "12px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box", fontSize: "16px" };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 60, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Assemble ESA Claim Packet</h1>
      <p style={{ color: "#666", marginBottom: "40px" }}>Select a generated invoice to bundle with tutor credentials and service logs for state submission.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "40px" }}>
        
        {/* Left Column: Selection Form */}
        <div>
          <form onSubmit={handleGeneratePacket} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <label style={labelStyle}>Select Generated Invoice</label>
              <select 
                required 
                value={selectedInvoiceId} 
                onChange={e => setSelectedInvoiceId(e.target.value)} 
                style={selectStyle}
              >
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
              style={{ 
                padding: "14px", 
                backgroundColor: selectedInvoiceId ? "#007bff" : "#ccc", 
                color: "white", border: "none", borderRadius: "6px", fontWeight: 700, 
                cursor: selectedInvoiceId ? "pointer" : "not-allowed",
                fontSize: "16px"
              }}
            >
              {isSubmitting ? "Assembling..." : "Generate Packet"}
            </button>

            {statusMessage && (
              <div style={{ 
                padding: "16px", borderRadius: "6px", textAlign: "center", fontWeight: 600,
                backgroundColor: statusMessage.includes("Error") ? "#fff5f5" : "#e6fffa",
                color: statusMessage.includes("Error") ? "#c53030" : "#2c7a7b",
                border: "1px solid"
              }}>
                {statusMessage}
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Dynamic Preview */}
        <div style={{ backgroundColor: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", height: "fit-content" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
            Packet Preview
          </h3>
          
          {selectedInvoice ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Student</div>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>
                  {selectedInvoice.students?.first_name} {selectedInvoice.students?.last_name}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Grade {selectedInvoice.students?.grade_level}</div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Provider / Tutor</div>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>{selectedInvoice.tutors?.full_name}</div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>{selectedInvoice.tutors?.credential_type}</div>
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Financials</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "14px", color: "#0f172a" }}>{selectedInvoice.invoice_number}</span>
                  <span style={{ fontWeight: 800, fontSize: "20px", color: "#2c7a7b" }}>${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "14px", color: "#94a3b8", textAlign: "center", margin: "40px 0" }}>
              Select an invoice to preview packet details.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}