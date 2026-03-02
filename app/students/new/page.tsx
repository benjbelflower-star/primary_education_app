"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function NewStudentForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [status, setStatus] = useState("Saving...");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { error } = await supabase.from("students").insert({
      school_id: PROTOTYPE_SCHOOL_ID,
      first_name: firstName,
      last_name: lastName,
      grade_level: gradeLevel,
      guardian_name: guardianName,
      guardian_email: guardianEmail,
      status: 'active'
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Student successfully enrolled.");
      setFirstName(""); setLastName(""); setGradeLevel("");
    }
    setIsSubmitting(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 40, fontFamily: "system-ui" }}>
      <h1>Enroll New Student</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
          <input placeholder="First Name" required value={firstName} onChange={e => setFirstName(e.target.value)} style={{ padding: 10 }} />
          <input placeholder="Last Name" required value={lastName} onChange={e => setLastName(e.target.value)} style={{ padding: 10 }} />
        </div>
        <select required value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={{ padding: 10 }}>
          <option value="">Select Grade Level...</option>
          {['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <input placeholder="Guardian Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} style={{ padding: 10 }} />
        <input type="email" placeholder="Guardian Email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} style={{ padding: 10 }} />
        
        <button disabled={isSubmitting} style={{ padding: 12, backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, fontWeight: 700 }}>
          {isSubmitting ? "Enrolling..." : "Complete Enrollment"}
        </button>
        {isSubmitting || status !== "Saving..." ? <p>{status}</p> : null}
      </form>
    </div>
  );
}