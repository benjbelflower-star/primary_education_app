"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function AddNewStudent() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Saving student profile...");

    const { error } = await supabase
      .from("students")
      .insert({
        school_id: PROTOTYPE_SCHOOL_ID,
        first_name: firstName,
        last_name: lastName,
        grade_level: gradeLevel,
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        status: "active"
      });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setIsSubmitting(false);
    } else {
      setMessage("Student added successfully! Redirecting...");
      setTimeout(() => router.push("/students"), 1500);
    }
  }

  // Notice boxSizing: "border-box" is included to prevent overflow
  const inputStyle: React.CSSProperties = { 
    padding: "12px", 
    borderRadius: "6px", 
    border: "1px solid #cbd5e1", 
    width: "100%", 
    boxSizing: "border-box", 
    fontSize: "15px"
  };
  
  const labelStyle: React.CSSProperties = { 
    fontWeight: 600, 
    fontSize: "13px", 
    display: "block", 
    marginBottom: "6px", 
    color: "#475569",
    textTransform: "uppercase"
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px", fontFamily: "system-ui" }}>
      <button 
        onClick={() => router.push("/students")} 
        style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: "24px" }}
      >
        ← Back to Roster
      </button>

      <h1 style={{ fontSize: "28px", margin: "0 0 8px 0", color: "#0f172a" }}>Add New Student</h1>
      <p style={{ color: "#64748b", marginBottom: "30px", fontSize: "14px" }}>
        Create a new student profile for ESA tracking.
      </p>

      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Using responsive-grid to stack these on mobile */}
          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input 
                required 
                type="text" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input 
                required 
                type="text" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                style={inputStyle} 
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Grade Level</label>
            <select required value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle}>
              <option value="">Select Grade...</option>
              <option value="Kindergarten">Kindergarten</option>
              <option value="1st Grade">1st Grade</option>
              <option value="2nd Grade">2nd Grade</option>
              <option value="3rd Grade">3rd Grade</option>
              <option value="4th Grade">4th Grade</option>
              <option value="5th Grade">5th Grade</option>
              <option value="6th Grade">6th Grade</option>
            </select>
          </div>

          <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "8px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "14px", color: "#0f172a" }}>Guardian Information</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Guardian Name</label>
                <input 
                  type="text" 
                  value={guardianName} 
                  onChange={e => setGuardianName(e.target.value)} 
                  style={inputStyle} 
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div>
                <label style={labelStyle}>Guardian Email</label>
                <input 
                  type="email" 
                  value={guardianEmail} 
                  onChange={e => setGuardianEmail(e.target.value)} 
                  style={inputStyle} 
                  placeholder="jane.doe@example.com"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              padding: "14px", 
              backgroundColor: "#0f172a", 
              color: "white", 
              border: "none", 
              borderRadius: "8px", 
              fontWeight: 600, 
              fontSize: "16px",
              cursor: isSubmitting ? "not-allowed" : "pointer", 
              marginTop: "12px" 
            }}
          >
            {isSubmitting ? "Saving..." : "Create Student"}
          </button>

          {message && (
            <div style={{ 
              padding: "12px", 
              borderRadius: "6px", 
              textAlign: "center", 
              fontSize: "14px", 
              fontWeight: 600, 
              backgroundColor: message.includes("Error") ? "#fff5f5" : "#f0fdf4", 
              color: message.includes("Error") ? "#c53030" : "#16a34a",
              border: `1px solid ${message.includes("Error") ? "#fecaca" : "#bbf7d0"}`
            }}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}