"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { Student } from "../../../../types";

export default function EditStudentForm() {
  const { id } = useParams();
  const router = useRouter();

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [status, setStatus] = useState("active");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStudent() {
      const { data, error } = await supabase
        .from("students")
        .select("first_name, last_name, grade_level, status")
        .eq("id", id)
        .single();

      if (data && !error) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setGradeLevel(data.grade_level || "");
        setStatus(data.status || "active");
      }
      setLoading(false);
    }
    loadStudent();
  }, [id]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from("students")
      .update({
        first_name: firstName,
        last_name: lastName,
        grade_level: gradeLevel,
        status: status
      })
      .eq("id", id);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Student updated successfully.");
      // Redirect back to the detail view after a short delay
      setTimeout(() => router.push(`/students/${id}`), 1500);
    }
    setIsSubmitting(false);
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "14px", display: "block", marginBottom: "4px" };
  const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" };

  if (loading) return <div style={{ padding: 60 }}>Loading student data...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 60, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Edit Student Profile</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>ID: {id}</p>

      <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input required value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input required value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Grade Level</label>
            <select required value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} style={inputStyle}>
              <option value="">Select Grade...</option>
              {['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Enrollment Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              flex: 1, padding: "12px", backgroundColor: "#007bff", color: "white", 
              border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" 
            }}
          >
            {isSubmitting ? "Saving..." : "Update Student"}
          </button>
          <button 
            type="button" 
            onClick={() => router.push(`/students/${id}`)}
            style={{ 
              padding: "12px 24px", backgroundColor: "white", color: "#333", 
              border: "1px solid #ccc", borderRadius: "6px", fontWeight: 600, cursor: "pointer" 
            }}
          >
            Cancel
          </button>
        </div>

        {message && (
          <div style={{ 
            marginTop: "10px", padding: "12px", borderRadius: "6px", textAlign: "center",
            backgroundColor: message.includes("Error") ? "#fff5f5" : "#f0fdf4",
            color: message.includes("Error") ? "#c53030" : "#2c7a7b",
            border: "1px solid"
          }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}