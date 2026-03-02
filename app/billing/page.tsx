"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { BillingAccount, Student } from "../../types";
import Link from "next/link";

type BillingAccountWithStudents = BillingAccount & { students: Student[] };

export default function BillingManagement() {
  const [accounts, setAccounts] = useState<BillingAccountWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadBillingData() {
      // Fetch billing accounts and their linked students
      const { data, error } = await supabase
        .from("billing_accounts")
        .select(`
          *,
          students (*)
        `)
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("guardian_name");

      if (data && !error) {
        setAccounts(data as BillingAccountWithStudents[]);
      }
      setLoading(false);
    }
    loadBillingData();
  }, []);

  const containerStyle: React.CSSProperties = { padding: "40px", fontFamily: "system-ui" };
  const cardGridStyle: React.CSSProperties = { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
    gap: "20px", 
    marginTop: "20px" 
  };
  const cardStyle: React.CSSProperties = { 
    border: "1px solid #ddd", 
    borderRadius: "8px", 
    padding: "20px", 
    backgroundColor: "white" 
  };

  if (loading) return <div style={containerStyle}>Loading billing registry...</div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Billing & Guardian Management</h1>
        <Link href="/billing/new" style={{ 
          padding: "10px 20px", 
          backgroundColor: "#007bff", 
          color: "white", 
          borderRadius: "6px", 
          textDecoration: "none", 
          fontWeight: 600 
        }}>
          + New Billing Account
        </Link>
      </div>

      <div style={cardGridStyle}>
        {accounts.map(acc => (
          <div key={acc.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <strong style={{ fontSize: "18px" }}>{acc.guardian_name}</strong>
              <span style={{ 
                fontSize: "10px", 
                backgroundColor: acc.status === 'active' ? "#e6fffa" : "#fff5f5", 
                color: acc.status === 'active' ? "#2c7a7b" : "#c53030",
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
                fontWeight: "bold",
                border: "1px solid"
              }}>
                {acc.status}
              </span>
            </div>
            
            <div style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
              <div>{acc.email || "No email on file"}</div>
              <div>{acc.phone || "No phone on file"}</div>
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#999", textTransform: "uppercase", marginBottom: "5px" }}>
                Linked Students
              </div>
              {acc.students && acc.students.length > 0 ? (
                acc.students.map(s => (
                  <div key={s.id} style={{ fontSize: "14px", padding: "2px 0" }}>
                    {s.first_name} {s.last_name} (Grade: {s.grade_level})
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "14px", fontStyle: "italic", color: "#ccc" }}>No students linked</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}