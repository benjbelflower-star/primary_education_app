"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Student } from "../../types";

export default function StudentRoster() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("last_name", { ascending: true });

      if (data) setStudents(data as Student[]);
      setLoading(false);
    }
    loadStudents();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: "#f0fdf4", text: "#16a34a" };
      case 'inactive': return { bg: "#fef2f2", text: "#dc2626" };
      default: return { bg: "#f1f5f9", text: "#475569" };
    }
  };

  if (loading) return <div style={{ padding: 40, fontFamily: "system-ui" }}>Loading Roster...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: 1000, margin: "0 auto", fontFamily: "system-ui" }}>
      
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", margin: 0, color: "#0f172a" }}>Students</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>{students.length} Total Enrolled</p>
        </div>
        <button 
          onClick={() => router.push("/students/new")}
          style={{ padding: "10px 16px", backgroundColor: "#0f172a", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
        >
          + Add
        </button>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        
        {/* Header Row (Hidden if wrapped, but provides table structure on desktop) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "13px", fontWeight: 600, textTransform: "uppercase" }}>
          <div style={{ flex: "2 1 200px" }}>Student Name</div>
          <div style={{ flex: "1 1 100px" }}>Grade</div>
          <div style={{ flex: "1 1 100px" }}>Status</div>
          <div style={{ flex: "1 1 80px", textAlign: "right" }}>Action</div>
        </div>

        {/* Data Rows (Wraps automatically on small screens) */}
        {students.map((student) => (
          <div key={student.id} style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "16px", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
            
            <div style={{ flex: "2 1 200px", minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {student.first_name} {student.last_name}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {student.guardian_email || "No Email on File"}
              </div>
            </div>

            <div style={{ flex: "1 1 100px", fontSize: "14px", color: "#475569" }}>
              {student.grade_level || "N/A"}
            </div>

            <div style={{ flex: "1 1 100px" }}>
              <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: getStatusColor(student.status).bg, color: getStatusColor(student.status).text }}>
                {student.status}
              </span>
            </div>

            <div style={{ flex: "1 1 80px", textAlign: "right" }}>
              <button onClick={() => router.push(`/students/${student.id}`)} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", fontWeight: 600 }}>
                View
              </button>
            </div>
            
          </div>
        ))}
      </div>

    </div>
  );
}