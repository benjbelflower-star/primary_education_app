"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Tutor, Invoice } from "../../../types";

export default function TutorDetailView() {
  const { id } = useParams();
  const router = useRouter();

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTutorData() {
      if (!id) return;

      // Fetch the tutor profile
      const { data: tutorData } = await supabase
        .from("tutors")
        .select("*")
        .eq("id", id)
        .single();

      // Fetch all invoices linked to this tutor
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select(`
          *,
          students (first_name, last_name, grade_level)
        `)
        .eq("tutor_id", id)
        .order("issue_date", { ascending: false });

      if (tutorData) setTutor(tutorData as Tutor);
      if (invoiceData) setInvoices(invoiceData as any);
      setLoading(false);
    }
    loadTutorData();
  }, [id]);

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #e1e8ed",
    marginBottom: "30px"
  };

  if (loading) return <div style={{ padding: 60 }}>Loading tutor profile...</div>;
  if (!tutor) return <div style={{ padding: 60 }}>Tutor not found.</div>;

  return (
    <div style={{ padding: 60, maxWidth: 1000, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", margin: "0 0 8px 0" }}>{tutor.full_name}</h1>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ 
              padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, 
              backgroundColor: tutor.is_active ? "#e6fffa" : "#fff5f5", 
              color: tutor.is_active ? "#2c7a7b" : "#c53030" 
            }}>
              {tutor.is_active ? "Active" : "Inactive"}
            </span>
            <span style={{ color: "#666", fontSize: "14px" }}>{tutor.credential_type}</span>
          </div>
        </div>
        <button 
          onClick={() => router.push(`/tutors/${id}/edit`)}
          style={{ padding: "10px 20px", borderRadius: "6px", border: "1px solid #ccc", background: "white", fontWeight: 600, cursor: "pointer" }}
        >
          Edit Profile
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "30px" }}>
        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Invoiced Sessions</h3>
            {invoices.length === 0 ? (
              <p style={{ color: "#999" }}>No invoices have been generated for this tutor yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #f4f7f6" }}>
                    <th style={{ padding: "12px 0" }}>Inv #</th>
                    <th style={{ padding: "12px 0" }}>Student</th>
                    <th style={{ padding: "12px 0" }}>Date</th>
                    <th style={{ padding: "12px 0" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid #f4f7f6" }}>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{inv.invoice_number}</td>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{inv.students.first_name} {inv.students.last_name}</td>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{inv.issue_date}</td>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{inv.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Credential Details</h3>
            <div style={{ marginBottom: "15px" }}>
              <div style={{ fontSize: "12px", color: "#999", fontWeight: 700, textTransform: "uppercase" }}>Degree/Title</div>
              <div style={{ fontWeight: 600 }}>{tutor.degree_title || "Not recorded"}</div>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <div style={{ fontSize: "12px", color: "#999", fontWeight: 700, textTransform: "uppercase" }}>Area of Study</div>
              <div style={{ fontSize: "14px" }}>{tutor.field_of_study || "Not recorded"}</div>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <div style={{ fontSize: "12px", color: "#999", fontWeight: 700, textTransform: "uppercase" }}>Expiration Date</div>
              <div style={{ fontSize: "14px", color: tutor.expiration_date && new Date(tutor.expiration_date) < new Date() ? "#c53030" : "inherit" }}>
                {tutor.expiration_date || "No expiration"}
              </div>
            </div>
            {tutor.credential_url && (
              <a 
                href={tutor.credential_url} 
                target="_blank" 
                style={{ display: "block", marginTop: "10px", color: "#007bff", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}
              >
                View Credential PDF ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}