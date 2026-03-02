"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Student, Tutor, ServiceLog } from "../../../types";

export default function NewInvoiceForm() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [unbilledLogs, setUnbilledLogs] = useState<ServiceLog[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState("");
  const [transactionMethod, setTransactionMethod] = useState("Debit Card");
  
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: st } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade_level")
        .eq("school_id", PROTOTYPE_SCHOOL_ID);

      const { data: tu } = await supabase
        .from("tutors")
        .select("id, full_name")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .eq("is_active", true);

      const { data: logs } = await supabase
        .from("service_logs")
        .select("id, student_id, tutor_id, service_date, service_description, hours, esa_category")
        .is("invoice_line_item_id", null)
        .eq("school_id", PROTOTYPE_SCHOOL_ID);
      
      if (st) setStudents(st as Student[]);
      if (tu) setTutors(tu as Tutor[]);
      if (logs) setUnbilledLogs(logs as ServiceLog[]);
    }
    loadData();
  }, []);

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
  [selectedStudentId, students]);

  // UPDATED: Now filters by BOTH Student AND Tutor
  const filteredLogs = useMemo(() => 
    unbilledLogs.filter(l => 
      l.student_id === selectedStudentId && 
      l.tutor_id === selectedTutorId
    ), 
  [unbilledLogs, selectedStudentId, selectedTutorId]);

  // Dynamic Math Calculations
  const totalHours = filteredLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  const calculatedTotal = hourlyRate ? totalHours * Number(hourlyRate) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (filteredLogs.length === 0) {
      setStatus("Error: No unbilled logs found for this Student/Tutor combination.");
      return;
    }
    if (!hourlyRate || hourlyRate <= 0) {
      setStatus("Error: Please enter a valid hourly rate.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Generating invoice...");

    // 1. Math Validation Check for ClassWallet
    const lineItemSum = filteredLogs.reduce((sum, log) => sum + (log.hours * Number(hourlyRate)), 0);
    
    // Using a tiny margin to prevent floating point math errors
    if (Math.abs(calculatedTotal - lineItemSum) > 0.01) {
      setStatus("Error: Transaction total does not match line item total. Generation aborted.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          school_id: PROTOTYPE_SCHOOL_ID,
          student_id: selectedStudentId,
          tutor_id: selectedTutorId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          status: "draft",
          transaction_method: transactionMethod,
          tutoring_subject: subject,
          student_grade_level: selectedStudent?.grade_level,
          vendor_name: "School Name",
          total: calculatedTotal // Added the total here
        })
        .select()
        .single();

      if (invError) throw invError;

      for (const log of filteredLogs) {
        const { data: lineItem, error: liError } = await supabase
          .from("invoice_line_items")
          .insert({
            invoice_id: invoice.id,
            description: log.service_description,
            amount: log.hours * Number(hourlyRate), // Dynamic rate applied here
            esa_category: log.esa_category,
            service_date_start: log.service_date
          })
          .select()
          .single();

        if (liError) throw liError;

        await supabase
          .from("service_logs")
          .update({ invoice_line_item_id: lineItem.id })
          .eq("id", log.id);
      }

      setStatus("Invoice successfully generated!");
      setTimeout(() => router.push(`/students/${selectedStudentId}`), 1500);
      
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "14px", display: "block", marginBottom: "4px" };
  const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 40, fontFamily: "system-ui" }}>
      <h1>Create Tutoring Invoice</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>Bundle unbilled service logs into a ClassWallet ready invoice.</p>
      
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "40px" }}>
        
        {/* Left Column: Form Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Student</label>
            <select required value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} style={inputStyle}>
              <option value="">Select Student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Grade: {s.grade_level})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={labelStyle}>Tutor</label>
            <select required value={selectedTutorId} onChange={e => setSelectedTutorId(e.target.value)} style={inputStyle}>
              <option value="">Select Tutor...</option>
              {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={labelStyle}>Hourly Rate ($)</label>
              <input 
                type="number" min="1" step="0.01" required 
                value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value) || "")} 
                style={inputStyle} placeholder="e.g. 50.00" 
              />
            </div>
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select value={transactionMethod} onChange={e => setTransactionMethod(e.target.value)} style={inputStyle}>
                <option value="Debit Card">Debit Card</option>
                <option value="ACH">ACH / Direct Pay</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={labelStyle}>Invoice Number</label>
              <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tutoring Subject</label>
              <input placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || filteredLogs.length === 0} 
            style={{ 
              padding: 14, 
              backgroundColor: filteredLogs.length > 0 ? "#007bff" : "#ccc", 
              color: "white", border: "none", borderRadius: 6, fontWeight: 700, 
              cursor: filteredLogs.length > 0 ? "pointer" : "not-allowed",
              marginTop: 10
            }}
          >
            {isSubmitting ? "Generating..." : `Bundle ${filteredLogs.length} Logs`}
          </button>
          
          {status && (
            <div style={{ 
              padding: "12px", borderRadius: "6px", textAlign: "center", fontWeight: 600,
              backgroundColor: status.includes("Error") ? "#fff5f5" : "#e6fffa",
              color: status.includes("Error") ? "#c53030" : "#2c7a7b"
            }}>
              {status}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Calculation Summary */}
        <div style={{ backgroundColor: "#f8fafc", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", height: "fit-content" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "18px" }}>Invoice Summary</h3>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Unbilled Logs:</span>
            <span style={{ fontWeight: 600 }}>{filteredLogs.length}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#64748b" }}>Total Hours:</span>
            <span style={{ fontWeight: 600 }}>{totalHours}</span>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #cbd5e1", margin: "20px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "16px" }}>Total Amount:</span>
            <span style={{ fontWeight: 800, fontSize: "24px", color: "#0f172a" }}>
              ${calculatedTotal.toFixed(2)}
            </span>
          </div>
          
          {filteredLogs.length > 0 ? (
            <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px dashed #cbd5e1" }}>
              <h4 style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", margin: "0 0 10px 0" }}>Included Dates</h4>
              {filteredLogs.map(log => (
                <div key={log.id} style={{ fontSize: 13, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                  <span>{log.service_date}</span>
                  <span style={{ color: "#64748b" }}>{log.hours}h</span>
                </div>
              ))}
            </div>
          ) : (
            selectedStudentId && selectedTutorId && (
              <p style={{ fontSize: "13px", color: "#c53030", marginTop: "20px", lineHeight: 1.5 }}>
                No unbilled hours exist for this student and tutor combination.
              </p>
            )
          )}
        </div>

      </form>
    </div>
  );
}