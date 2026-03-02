"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; 
import { supabase } from "../../../lib/supabaseClient";
import { Student, Invoice, ServiceLog } from "../../../types";

export default function StudentDetailView() {
  const { id } = useParams();
  const router = useRouter(); 

  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New State for Guardian Management
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    async function loadStudentData() {
      if (!id) return;

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*")
        .eq("student_id", id)
        .order("issue_date", { ascending: false });

      const { data: logData } = await supabase
        .from("service_logs")
        .select("*")
        .eq("student_id", id)
        .order("service_date", { ascending: false });

      if (studentData) {
        setStudent(studentData as Student);
        // Pre-fill the guardian form with existing database data
        setGuardianName(studentData.guardian_name || "");
        setGuardianEmail(studentData.guardian_email || "");
      }
      if (invoiceData) setInvoices(invoiceData as Invoice[]);
      if (logData) setLogs(logData as ServiceLog[]);
      
      setLoading(false);
    }

    loadStudentData();
  }, [id]);

  // New Function to handle saving Guardian Info
  async function handleUpdateGuardian(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage("Saving...");

    const { error } = await supabase
      .from("students")
      .update({
        guardian_name: guardianName,
        guardian_email: guardianEmail
      })
      .eq("id", id);

    if (error) {
      setUpdateMessage(`Error: ${error.message}`);
    } else {
      setUpdateMessage("Guardian saved!");
      if (student) {
        setStudent({ ...student, guardian_name: guardianName, guardian_email: guardianEmail });
      }
    }
    setIsUpdating(false);
  }

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #e1e8ed",
    marginBottom: "30px"
  };

  const badgeStyle = (status: string): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    backgroundColor: status === "active" ? "#e6fffa" : "#f7fafc",
    color: status === "active" ? "#2c7a7b" : "#4a5568"
  });

  const inputStyle: React.CSSProperties = { 
    padding: "8px", 
    borderRadius: "6px", 
    border: "1px solid #ccc", 
    width: "100%", 
    boxSizing: "border-box",
    marginBottom: "10px"
  };

  const labelStyle: React.CSSProperties = { 
    fontSize: "12px", 
    color: "#999", 
    fontWeight: 700, 
    textTransform: "uppercase",
    display: "block",
    marginBottom: "4px"
  };

  if (loading) return <div style={{ padding: 60 }}>Loading student profile...</div>;
  if (!student) return <div style={{ padding: 60 }}>Student not found.</div>;

  return (
    <div style={{ padding: 60, maxWidth: 1000, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", margin: "0 0 8px 0" }}>{student.first_name} {student.last_name}</h1>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={badgeStyle(student.status)}>Status: {student.status}</span>
            <span style={{ color: "#666", fontSize: "14px" }}>Grade {student.grade_level}</span>
          </div>
        </div>
        <button 
          onClick={() => router.push(`/students/${id}/edit`)}
          style={{ 
            padding: "10px 20px", 
            borderRadius: "6px", 
            border: "1px solid #ccc", 
            background: "white", 
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Edit Profile
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "30px" }}>
        
        {/* Left Column: History Tables (Kept exactly as you had them) */}
        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Service History</h3>
            {logs.length === 0 ? (
              <p style={{ color: "#999" }}>No service logs recorded for this student.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #f4f7f6" }}>
                    <th style={{ padding: "12px 0" }}>Date</th>
                    <th style={{ padding: "12px 0" }}>Description</th>
                    <th style={{ padding: "12px 0" }}>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f4f7f6" }}>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{log.service_date}</td>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{log.service_description}</td>
                      <td style={{ padding: "12px 0", fontSize: "14px" }}>{log.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Billing History</h3>
            {invoices.length === 0 ? (
              <p style={{ color: "#999" }}>No invoices generated yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {invoices.map(inv => (
                  <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px", border: "1px solid #f4f7f6", borderRadius: "8px" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Invoice {inv.invoice_number}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>Issued: {inv.issue_date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>${inv.total}</div>
                      <div style={{ fontSize: "12px", color: "#2c7a7b" }}>{inv.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Guardian Form & Compliance Note */}
        <div>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>Guardian Info</h3>
            
            <form onSubmit={handleUpdateGuardian}>
              <div>
                <label style={labelStyle}>Primary Contact Name</label>
                <input 
                  type="text" 
                  value={guardianName} 
                  onChange={e => setGuardianName(e.target.value)} 
                  style={inputStyle} 
                  placeholder="e.g. Jane Doe"
                />
              </div>
              
              <div>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email" 
                  value={guardianEmail} 
                  onChange={e => setGuardianEmail(e.target.value)} 
                  style={inputStyle} 
                  placeholder="guardian@example.com"
                />
              </div>

              <button 
                type="submit" 
                disabled={isUpdating}
                style={{ 
                  width: "100%",
                  padding: "10px", 
                  backgroundColor: "#0f172a", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "6px", 
                  fontWeight: 600, 
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  marginTop: "10px"
                }}
              >
                {isUpdating ? "Saving..." : "Save Contact Info"}
              </button>

              {updateMessage && (
                <div style={{ 
                  marginTop: "10px", 
                  padding: "8px", 
                  borderRadius: "6px", 
                  textAlign: "center", 
                  fontSize: "13px", 
                  fontWeight: 600, 
                  backgroundColor: updateMessage.includes("Error") ? "#fff5f5" : "#f0fdf4", 
                  color: updateMessage.includes("Error") ? "#c53030" : "#16a34a" 
                }}>
                  {updateMessage}
                </div>
              )}
            </form>
          </div>

          <div style={{ ...sectionStyle, backgroundColor: "#f8fafc" }}>
            <h4 style={{ marginTop: 0 }}>Compliance Note</h4>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              This student is enrolled in the ESA program. All tutoring logs must include an approved tutor credential to be valid for ClassWallet submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}