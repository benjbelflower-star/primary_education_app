"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Tutor } from "../../types";
import { useRouter } from "next/navigation";

export default function TutorManagement() {
  const router = useRouter();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadTutors() {
      const { data } = await supabase
        .from("tutors")
        .select("*")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("full_name");

      if (data) setTutors(data as Tutor[]);
      setLoading(false);
    }
    loadTutors();
  }, []);

  const getComplianceStatus = (expirationDate: string | null) => {
    if (!expirationDate) return { text: "No Expiration", color: "#64748b", bg: "#f1f5f9" };
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Expired", color: "#b91c1c", bg: "#fef2f2" };
    if (diffDays <= 30) return { text: `${diffDays}d Left`, color: "#a16207", bg: "#fefce8" };
    return { text: "Valid", color: "#15803d", bg: "#f0fdf4" };
  };

  if (loading) return <div style={{ padding: 40 }}>Loading Providers...</div>;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>Tutors</h1>
        <button 
          onClick={() => router.push("/tutors/new")}
          style={{ backgroundColor: "#0f172a", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: 600 }}
        >
          + Add
        </button>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {tutors.map((t) => {
          const status = getComplianceStatus(t.credential_expiration);
          return (
            <div 
              key={t.id} 
              onClick={() => router.push(`/tutors/${t.id}`)}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "16px", 
                borderBottom: "1px solid #f1f5f9",
                cursor: "pointer"
              }}
            >
              {/* Column 1: Name & Credential (Primary) */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.full_name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.credential_type || "No Credential Stored"}
                </div>
              </div>

              {/* Column 2: Compliance Badge (Secondary) */}
              <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                <span style={{ 
                  padding: "4px 10px", 
                  borderRadius: "6px", 
                  fontSize: "11px", 
                  fontWeight: 700, 
                  backgroundColor: status.bg, 
                  color: status.color,
                  display: "inline-block",
                  textAlign: "center",
                  minWidth: "75px"
                }}>
                  {status.text}
                </span>
              </div>

              {/* Column .5: Action Arrow */}
              <div style={{ marginLeft: "12px", color: "#cbd5e1", fontSize: "18px" }}>
                ›
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}