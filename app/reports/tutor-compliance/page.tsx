"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Tutor } from "../../../types";
import Link from "next/link";

type ComplianceTutor = Tutor & {
  daysRemaining: number | null;
  complianceStatus: "expired" | "warning" | "valid";
};

export default function TutorComplianceReport() {
  const [tutors, setTutors] = useState<ComplianceTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadComplianceData() {
      const { data, error } = await supabase
        .from("tutors")
        .select("*")
        .eq("school_id", PROTOTYPE_SCHOOL_ID);

      if (data && !error) {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const processed = data.map((t) => {
          let daysRemaining = null;
          let complianceStatus: "expired" | "warning" | "valid" = "valid";

          if (t.expiration_date) {
            const exp = new Date(t.expiration_date);
            const diffTime = exp.getTime() - now.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysRemaining < 0) complianceStatus = "expired";
            else if (daysRemaining <= 30) complianceStatus = "warning";
          }

          return { ...t, daysRemaining, complianceStatus } as ComplianceTutor;
        });

        processed.sort((a, b) => {
          const order: Record<"expired" | "warning" | "valid", number> = { 
            expired: 0, 
            warning: 1, 
            valid: 2 
          };
          return order[a.complianceStatus] - order[b.complianceStatus];
        });

        setTutors(processed);
      }
      setLoading(false);
    }
    loadComplianceData();
  }, []);

  const getStatusStyle = (status: "expired" | "warning" | "valid"): React.CSSProperties => {
    if (status === "expired") return { color: "#c53030", backgroundColor: "#fff5f5", fontWeight: 700 };
    if (status === "warning") return { color: "#975a16", backgroundColor: "#fffff0", fontWeight: 700 };
    return { color: "#2c7a7b", backgroundColor: "#e6fffa", fontWeight: 700 };
  };

  if (loading) return <div style={{ padding: 60 }}>Generating compliance audit...</div>;

  return (
    <div style={{ padding: 60, maxWidth: 1200, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Tutor Compliance Report</h1>
      <p style={{ color: "#666", marginBottom: "40px" }}>Monitor credential expiration across your tutoring staff.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "40px" }}>
        <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>EXPIRED</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#c53030" }}>
            {tutors.filter(t => t.complianceStatus === "expired").length}
          </div>
        </div>
        <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>EXPIRING (30 DAYS)</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#975a16" }}>
            {tutors.filter(t => t.complianceStatus === "warning").length}
          </div>
        </div>
        <div style={{ padding: "20px", borderRadius: "8px", border: "1px solid #ddd", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>VALID</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#2c7a7b" }}>
            {tutors.filter(t => t.complianceStatus === "valid").length}
          </div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #eee", fontSize: "14px", color: "#666" }}>
            <th style={{ padding: "12px" }}>Tutor Name</th>
            <th style={{ padding: "12px" }}>Credential Type</th>
            <th style={{ padding: "12px" }}>Expiration</th>
            <th style={{ padding: "12px" }}>Status</th>
            <th style={{ padding: "12px" }}>Days Left</th>
          </tr>
        </thead>
        <tbody>
          {tutors.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px" }}>
                <Link href={`/tutors/${t.id}`} style={{ color: "#007bff", fontWeight: 600, textDecoration: "none" }}>
                  {t.full_name}
                </Link>
              </td>
              <td style={{ padding: "12px", fontSize: "14px" }}>{t.credential_type}</td>
              <td style={{ padding: "12px", fontSize: "14px" }}>{t.expiration_date || "N/A"}</td>
              <td style={{ padding: "12px" }}>
                <span style={{ 
                  padding: "4px 10px", borderRadius: "12px", fontSize: "11px", textTransform: "uppercase",
                  ...getStatusStyle(t.complianceStatus)
                }}>
                  {t.complianceStatus}
                </span>
              </td>
              <td style={{ padding: "12px", fontSize: "14px" }}>
                {t.daysRemaining !== null ? t.daysRemaining : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}