"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Tutor } from "../../types";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TutorManagement() {
  const router = useRouter();
  const [tutors, setTutors] = useState<(Tutor & { invoice_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadTutors() {
      const { data: tutorData } = await supabase
        .from("tutors")
        .select("*, invoices(id)")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("full_name");

      if (tutorData) {
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

  async function toggleStatus(tutor: any) {
    const { error } = await supabase
      .from("tutors")
      .update({ is_active: !tutor.is_active })
      .eq("id", tutor.id);

    if (!error) {
      setTutors(prev => prev.map(t => t.id === tutor.id ? { ...t, is_active: !t.is_active } : t));
    }
  }

  const getCredentialStatus = (expirationDate: string | null | undefined) => {
    if (!expirationDate) return { text: "No Expiration", color: "#64748b", bg: "#f1f5f9" };
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Expired", color: "#c53030", bg: "#fff5f5" };
    if (diffDays <= 30) return { text: `Expires in ${diffDays}d`, color: "#ca8a04", bg: "#fefce8" };
    return { text: "Valid", color: "#16a34a", bg: "#f0fdf4" };
  };

  if (loading) return <div style={{ padding: 40, fontFamily: "system-ui" }}>Loading Providers...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: 1000, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", margin: 0, color: "#0f172a" }}>Tutors</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>ESA Compliance Roster</p>
        </div>
        <Link href="/tutors/new" style={{ padding: "10px 16px", backgroundColor: "#0f172a", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "14px" }}>
          + Add
        </Link>
      </div>

      {/* MOBILE VIEW */}
      <div className="block md:hidden" style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        {tutors.map((t) => {
          const compliance = getCredentialStatus(t.credential_expiration);
          return (
            <div key={t.id} onClick={() => router.push(`/tutors/${t.id}`)} style={{ display: "flex", alignItems: "center", padding: "16px 12px", borderBottom: "1px solid #f1f5f9", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.full_name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{t.credential_type?.slice(0, 20)}...</div>
              </div>
              <div style={{ marginLeft: "12px" }}>
                <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, backgroundColor: compliance.bg, color: compliance.color }}>
                  {compliance.text}
                </span>
              </div>
              <div style={{ marginLeft: "10px", color: "#cbd5e1" }}>›</div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:block" style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Provider</th>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Compliance</th>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Invoices</th>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map((t) => {
              const compliance = getCredentialStatus(t.credential_expiration);
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: t.is_active ? 1 : 0.6 }}>
                  <td style={{ padding: "16px" }}>
                    <Link href={`/tutors/${t.id}`} style={{ textDecoration: "none", fontWeight: 600, color: "#007bff" }}>{t.full_name}</Link>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{t.credential_type}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: compliance.bg, color: compliance.color }}>
                      {compliance.text}
                    </span>
                  </td>
                  <td style={{ padding: "16px", fontSize: "14px" }}>{t.invoice_count}</td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    <button onClick={() => toggleStatus(t)} style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ccc", background: "white", cursor: "pointer", fontWeight: 600 }}>
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