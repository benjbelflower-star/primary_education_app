"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Student } from "../../types";
import Link from "next/link";

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("last_name");
      if (data) setStudents(data as Student[]);
      setLoading(false);
    }
    loadStudents();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1>Student Management</h1>
        <Link href="/students/new" style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
          + Enroll New Student
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {students.map(s => (
          <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, backgroundColor: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{s.first_name} {s.last_name}</div>
              <span style={{ fontSize: 12, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, backgroundColor: "#e9ecef" }}>
                {s.status}
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 14 }}>
              <div><strong>Grade:</strong> {s.grade_level || "Not set"}</div>
              <div style={{ marginTop: 8, color: "#666" }}>
                <strong>Guardian:</strong> {s.guardian_name || "Placeholder Name"}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{s.guardian_email || "guardian@example.com"}</div>
            </div>
            <button style={{ marginTop: 15, width: "100%", padding: "8px", borderRadius: 4, border: "1px solid #eee", cursor: "pointer", background: "#f8f9fa" }}>
              View Billing History
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}