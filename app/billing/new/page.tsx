"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Student } from "../../../types";

export default function NewBillingAccount() {
  const [guardianName, setGuardianName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadUnlinkedStudents() {
      // Fetch students who don't have a billing account yet
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade_level")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .is("billing_account_id", null);
      
      if (data) setAvailableStudents(data as Student[]);
    }
    loadUnlinkedStudents();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("Creating account...");

    try {
      // 1. Create the billing account
      const { data: account, error: accError } = await supabase
        .from("billing_accounts")
        .insert({
          school_id: PROTOTYPE_SCHOOL_ID,
          guardian_name: guardianName,
          email: email,
          phone: phone,
          status: 'active'
        })
        .select()
        .single();

      if (accError) throw accError;

      // 2. Link the selected students to this account
      if (selectedStudentIds.length > 0) {
        const { error: linkError } = await supabase
          .from("students")
          .update({ billing_account_id: account.id })
          .in("id", selectedStudentIds);
        
        if (linkError) throw linkError;
      }

      setStatus("Success: Billing account created and students linked.");
      setGuardianName(""); setEmail(""); setPhone(""); setSelectedStudentIds([]);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "14px", display: "block", marginBottom: "4px" };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px", fontFamily: "system-ui" }}>
      <h1>New Billing Account</h1>
      <p style={{ opacity: 0.7, marginBottom: "25px" }}>Create a guardian profile to manage ClassWallet payments.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={labelStyle}>Guardian Full Name</label>
          <input required value={guardianName} onChange={e => setGuardianName(e.target.value)} style={inputStyle} placeholder="e.g. Robert Smith" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="robert@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="(555) 000-0000" />
          </div>
        </div>

        <div style={{ border: "1px solid #eee", padding: "15px", borderRadius: "8px" }}>
          <label style={labelStyle}>Link Students (Multi-select)</label>
          <p style={{ fontSize: "12px", color: "#999", marginBottom: "10px" }}>Select the students this guardian is responsible for.</p>
          <div style={{ maxHeight: "150px", overflowY: "auto" }}>
            {availableStudents.map(s => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0", fontSize: "14px" }}>
                <input 
                  type="checkbox" 
                  checked={selectedStudentIds.includes(s.id)} 
                  onChange={(e) => {
                    if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                    else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                  }} 
                />
                {s.first_name} {s.last_name} (Grade: {s.grade_level})
              </label>
            ))}
            {availableStudents.length === 0 && <div style={{ fontSize: "13px", color: "#ccc" }}>No unlinked students found.</div>}
          </div>
        </div>

        <button disabled={isSubmitting} style={{ padding: "14px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
          {isSubmitting ? "Saving..." : "Create Account & Link Students"}
        </button>
        {status && <p style={{ textAlign: "center", fontWeight: 600, fontSize: "14px" }}>{status}</p>}
      </form>
    </div>
  );
}