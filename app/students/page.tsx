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
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
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

      {/* MOBILE VIEW: block on mobile, hidden on medium screens and up */}
      <div className="block md:hidden" style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        {students.map((student) => {
          const colors = getStatusColor(student.status);
          return (
            <div 
              key={student.id}
              onClick={() => router.push(`/students/${student.id}`)}
              style={{ display: "flex", alignItems: "center", padding: "16px 12px", borderBottom: "1px solid #f1f5f9", justifyContent: "space-between", cursor: "pointer" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {student.first_name} {student.last_name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Grade {student.grade_level || "N/A"} • {student.guardian_name || "No Guardian"}
                </div>
              </div>
              
              <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", backgroundColor: colors.bg, color: colors.text, display: "inline-block", textAlign: "center", minWidth: "70px" }}>
                  {student.status}
                </span>
              </div>
              <div style={{ marginLeft: "12px", color: "#cbd5e1", fontSize: "18px" }}>›</div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW: hidden on mobile, block on medium screens and up */}
      <div className="hidden md:block" style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Student Name</th>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Grade</th>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Status</th>
              <th style={{ padding: "16px", fontSize: "13px", color: "#64748b", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "16px" }}>
                  <div style={{ fontWeight: 600 }}>{student.first_name} {student.last_name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{student.guardian_email}</div>
                </td>
                <td style={{ padding: "16px", fontSize: "14px" }}>{student.grade_level}</td>
                <td style={{ padding: "16px" }}>
                  <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, backgroundColor: getStatusColor(student.status).bg, color: getStatusColor(student.status).text }}>
                    {student.status}
                  </span>
                </td>
                <td style={{ padding: "16px", textAlign: "right" }}>
                  <button onClick={() => router.push(`/students/${student.id}`)} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", fontWeight: 600 }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}