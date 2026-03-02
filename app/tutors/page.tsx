"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Tutor } from "../../types";
import Link from "next/link";

export default function TutorManagement() {
  const [tutors, setTutors] = useState<(Tutor & { invoice_count: number, credential_expiration?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadTutors() {
      // Fetch tutors
      const { data: tutorData } = await supabase
        .from("tutors")
        .select("*, invoices(id)")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("full_name");

      if (tutorData) {
        // Map the data to include the count of linked invoices
        const formatted = tutorData.map(t => ({
          ...t,
          invoice_count: t.invoices?.length || 0
        }));
        setTutors(formatted as any);
      }
      setLoading(false);
    }
    loadTutors();
  }, []);

  async function toggleStatus(tutor: Tutor) {
    const { error } = await supabase
      .from("tutors")
      .update({ is_active: !tutor.is_active })
      .eq("id", tutor.id);

    if (!error) {
      setTutors(prev => prev.map(t => t.id === tutor.id ? { ...t, is_active: !t.is_active } : t));
    }
  }

  // Helper function to check credential status for ESA Compliance
  const getCredentialStatus = (expirationDate: string | null | undefined) => {
    if (!expirationDate) return { text: "No Expiration", color: "#64748b", bg: "#f1f5f9" };
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Expired", color: "#c53030", bg: "#fff5f5" };
    if (diffDays <= 30) return { text: `Expires in ${diffDays} days`, color: "#ca8a04", bg: "#fefce8" };
    return { text: "Valid", color: "#16a34a", bg: "#f0fdf4" };
  };

  if (loading) return <div style={{ padding: 40 }}>Loading management console...</div>;

  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0" }}>Tutor Management</h1>
          <p style={{ color: "#666", margin: 0 }}>Manage teaching staff and track ESA compliance credentials.</p>
        </div>
        <Link href="/tutors/new" style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
          + Add New Tutor
        </Link>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e1e8ed", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee", backgroundColor: "#f8fafc" }}>
              <th style={{ padding: "16px 12px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Name</th>
              <th style={{ padding: "16px 12px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Credential</th>
              <th style={{ padding: "16px 12px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Compliance</th>
              <th style={{ padding: "16px 12px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Invoices</th>
              <th style={{ padding: "16px 12px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "16px 12px", color: "#64748b", fontSize: "13px", textTransform: "uppercase" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map(t => {
              const complianceStatus = getCredentialStatus(t.credential_expiration);
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #eee", opacity: t.is_active ? 1 : 0.6 }}>
                  <td style={{ padding: "16px 12px" }}>
                    <Link href={`/tutors/${t.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 600, color: "#007bff", cursor: "pointer" }}>
                        {t.full_name}
                      </div>
                    </Link>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{t.email}</div>
                  </td>
                  <td style={{ padding: "16px 12px" }}>{t.credential_type || "None"}</td>
                  <td style={{ padding: "16px 12px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "12px", 
                      fontSize: "12px", 
                      fontWeight: 700, 
                      backgroundColor: complianceStatus.bg, 
                      color: complianceStatus.color 
                    }}>
                      {complianceStatus.text}
                    </span>
                  </td>
                  <td style={{ padding: "16px 12px" }}>
                    <span style={{ backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 600, padding: "4px 8px", borderRadius: 4, fontSize: "13px" }}>
                      {t.invoice_count}
                    </span>
                  </td>
                  <td style={{ padding: "16px 12px" }}>
                    <span style={{ color: t.is_active ? "#16a34a" : "#dc3545", fontWeight: 700 }}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "16px 12px" }}>
                    <button 
                      onClick={() => toggleStatus(t)}
                      style={{ padding: "6px 12px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "white", fontWeight: 600, color: "#475569" }}
                    >
                      {t.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}