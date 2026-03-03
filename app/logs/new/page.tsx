"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function LogService() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [students, setStudents] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTutor, setSelectedTutor] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDropdowns() {
      const { data: studentData } = await supabase.from("students").select("id, first_name, last_name").eq("school_id", PROTOTYPE_SCHOOL_ID).eq("status", "active");
      const { data: tutorData } = await supabase.from("tutors").select("id, full_name").eq("school_id", PROTOTYPE_SCHOOL_ID).eq("is_active", true);
      
      if (studentData) setStudents(studentData);
      if (tutorData) setTutors(tutorData);
    }
    loadDropdowns();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Logging service...");

    const { error } = await supabase
      .from("service_logs")
      .insert({
        school_id: PROTOTYPE_SCHOOL_ID,
        student_id: selectedStudent,
        tutor_id: selectedTutor,
        service_date: serviceDate,
        hours: parseFloat(hours),
        service_description: description
      });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setIsSubmitting(false);
    } else {
      setMessage("Service logged successfully!");
      setTimeout(() => router.push("/"), 1500);
    }
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "13px", marginBottom: "6px", display: "block", color: "#475569", textTransform: "uppercase" };
  const inputStyle: React.CSSProperties = { padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", fontSize: "15px", backgroundColor: "white" };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px", fontFamily: "system-ui" }}>
      <button 
        onClick={() => router.push("/")} 
        style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: "24px" }}
      >
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: "28px", margin: "0 0 8px 0", color: "#0f172a" }}>Log Service</h1>
      <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>Record educational hours for ESA billing.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        
        <div>
          <label style={labelStyle}>Student</label>
          <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={inputStyle}>
            <option value="">Select a student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Provider / Tutor</label>
          <select required value={selectedTutor} onChange={e => setSelectedTutor(e.target.value)} style={inputStyle}>
            <option value="">Select a provider...</option>
            {tutors.map(t => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>

        {/* Tailwind grid: 1 column on mobile, 2 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Date of Service</label>
            <input required type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Total Hours</label>
            <input required type="number" step="0.25" min="0.25" value={hours} onChange={e => setHours(e.target.value)} style={inputStyle} placeholder="e.g. 1.5" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Service Description</label>
          <textarea 
            required 
            rows={3}
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            style={{ ...inputStyle, resize: "vertical" }} 
            placeholder="Describe the educational services provided..."
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: "14px", backgroundColor: "#0f172a", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: "8px", fontSize: "16px" }}
        >
          {isSubmitting ? "Saving..." : "Submit Log"}
        </button>

        {message && (
          <div style={{ padding: "12px", borderRadius: "6px", textAlign: "center", fontWeight: 600, backgroundColor: message.includes("Error") ? "#fff5f5" : "#f0fdf4", color: message.includes("Error") ? "#c53030" : "#16a34a" }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}