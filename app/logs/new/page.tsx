"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Student, Tutor } from "../../../types";

// 1. PLACE THE CATEGORY LIST HERE (Outside the component function)
const ESA_CATEGORIES = [
  "530 Coverdell Plan",
  "Assistive Technology Rental",
  "Braille Transition Services",
  "Curricula and Supplemental Materials",
  "Educational and/or Psychological Evaluations",
  "Educational Therapies and Services",
  "ESA Bank Fees",
  "Online Private Program Expenses",
  "Paraprofessional Services",
  "Postsecondary Institution (College) Expenses",
  "Private School Expenses",
  "Public School Tuition Expenses",
  "Testing Fees",
  "Tutoring Services",
  "Vocational / Life Skills Education",
  "Other Goods and Services"
];

export default function NewServiceLog() {
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  
  // Form State
  const [studentId, setStudentId] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [esaCategory, setEsaCategory] = useState(""); // This state links to the dropdown
  
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: st } = await supabase.from("students").select("id, first_name, last_name, grade_level").eq("school_id", PROTOTYPE_SCHOOL_ID);
      const { data: tu } = await supabase.from("tutors").select("id, full_name").eq("school_id", PROTOTYPE_SCHOOL_ID).eq("is_active", true);
      if (st) setStudents(st as Student[]);
      if (tu) setTutors(tu as Tutor[]);
    }
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("Saving log...");

    const { error } = await supabase.from("service_logs").insert({
      school_id: PROTOTYPE_SCHOOL_ID,
      student_id: studentId,
      tutor_id: tutorId,
      service_date: serviceDate,
      service_description: description,
      hours: parseFloat(hours),
      esa_category: esaCategory
    });

    if (error) setStatus(`Error: ${error.message}`);
    else {
      setStatus("Service log saved successfully!");
      setDescription(""); setHours(""); setEsaCategory("");
    }
    setIsSubmitting(false);
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "14px", display: "block", marginBottom: "4px" };
  const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 40, fontFamily: "system-ui" }}>
      <h1>Log Daily Tutoring Service</h1>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
        <div>
          <label style={labelStyle}>Student</label>
          <select required value={studentId} onChange={e => setStudentId(e.target.value)} style={inputStyle}>
            <option value="">Select Student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Grade: {s.grade_level})</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Tutor</label>
          <select required value={tutorId} onChange={e => setTutorId(e.target.value)} style={inputStyle}>
            <option value="">Select Tutor...</option>
            {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={labelStyle}>Service Date</label>
            <input type="date" required value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hours</label>
            <input type="number" min="0.0"step="0.25" required value={hours} onChange={e => setHours(e.target.value)} style={inputStyle} placeholder="e.g. 1.5" />
          </div>
        </div>

        {/* 2. UPDATE THIS FIELD: ESA Category Dropdown */}
        <div>
          <label style={labelStyle}>ESA Category</label>
          <select 
            required 
            value={esaCategory} 
            onChange={(e) => setEsaCategory(e.target.value)} 
            style={inputStyle}
          >
            <option value="">Select a Category...</option>
            {ESA_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Service Description</label>
          <textarea required value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, height: 80 }} placeholder="What was covered during the session?" />
        </div>

        <button 
          disabled={isSubmitting} 
          style={{ padding: 14, backgroundColor: "#007bff", color: "white", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
        >
          {isSubmitting ? "Saving..." : "Save Service Log"}
        </button>
        {status && <p style={{ textAlign: "center", fontWeight: 600 }}>{status}</p>}
      </form>
    </div>
  );
}