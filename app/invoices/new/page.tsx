"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Student, Tutor, ServiceLog } from "../../../types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function NewInvoiceForm() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [unbilledLogs, setUnbilledLogs] = useState<ServiceLog[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [subject, setSubject] = useState("");
  const [transactionMethod, setTransactionMethod] = useState("Debit Card");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      const sid = userData.school_id;
      setSchoolId(sid);

      const { data: st } = await supabase.from("students").select("id, first_name, last_name, grade_level").eq("school_id", sid);
      const { data: tu } = await supabase.from("tutors").select("id, full_name").eq("school_id", sid).eq("is_active", true);
      const { data: logs } = await supabase.from("service_logs").select("id, student_id, tutor_id, service_date, service_description, hours, esa_category").is("invoice_line_item_id", null).eq("school_id", sid);

      if (st) setStudents(st as Student[]);
      if (tu) setTutors(tu as Tutor[]);
      if (logs) setUnbilledLogs(logs as ServiceLog[]);
    }
    load();
  }, []);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [selectedStudentId, students]);

useEffect(() => {
  async function generateInvoiceNumber() {
    if (!selectedStudentId) {
      setInvoiceNumber("");
      return;
    }

    const last4 = selectedStudentId.replace(/-/g, "").slice(-4).toUpperCase();

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("student_id", selectedStudentId);

    const nextNum = ((existing?.length || 0) + 1).toString().padStart(3, "0");
    setInvoiceNumber(last4 + "." + nextNum);
  }
  generateInvoiceNumber();
}, [selectedStudentId]);
  const filteredLogs = useMemo(() => unbilledLogs.filter(l => l.student_id === selectedStudentId && l.tutor_id === selectedTutorId), [unbilledLogs, selectedStudentId, selectedTutorId]);
  const totalHours = filteredLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  const calculatedTotal = hourlyRate ? totalHours * Number(hourlyRate) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    if (filteredLogs.length === 0) { setStatus("Error: No unbilled logs found for this Student/Tutor combination."); return; }
    if (!hourlyRate || hourlyRate <= 0) { setStatus("Error: Please enter a valid hourly rate."); return; }

    setIsSubmitting(true);
    setStatus("Generating invoice...");

    const lineItemSum = filteredLogs.reduce((sum, log) => sum + (log.hours * Number(hourlyRate)), 0);
    if (Math.abs(calculatedTotal - lineItemSum) > 0.01) {
      setStatus("Error: Transaction total does not match line item total. Generation aborted.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          school_id: schoolId,
          student_id: selectedStudentId,
          tutor_id: selectedTutorId,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          status: "draft",
          transaction_method: transactionMethod,
          tutoring_subject: subject,
          student_grade_level: selectedStudent?.grade_level,
          vendor_name: "School Name",
          total: calculatedTotal,
        })
        .select()
        .single();

      if (invError) throw invError;

      for (const log of filteredLogs) {
        const { data: lineItem, error: liError } = await supabase
          .from("invoice_line_items")
          .insert({ school_id: schoolId, invoice_id: invoice.id, description: log.service_description, amount: log.hours * Number(hourlyRate), esa_category: log.esa_category, service_date_start: log.service_date })
          .select().single();
        if (liError) throw liError;
        await supabase.from("service_logs").update({ invoice_line_item_id: lineItem.id }).eq("id", log.id);
      }

      setStatus("Invoice successfully generated!");
      setTimeout(() => router.push("/students/" + selectedStudentId), 1500);
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusClass(msg: string) {
    if (msg.includes("Error")) return "p-3 rounded-lg text-center font-semibold text-sm bg-red-50 text-red-700";
    return "p-3 rounded-lg text-center font-semibold text-sm bg-teal-50 text-teal-700";
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Create Tutoring Invoice</h1>
      <p className="text-gray-500 text-sm mb-8">Bundle unbilled service logs into a ClassWallet-ready invoice.</p>

      <form onSubmit={handleSubmit} className="flex flex-col lg:grid lg:grid-cols-[1fr_280px] gap-8">
        <div className="flex flex-col gap-5">
          <div>
            <label className={labelClass}>Student</label>
            <select required value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className={inputClass}>
              <option value="">Select Student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} (Grade: {s.grade_level})</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tutor</label>
            <select required value={selectedTutorId} onChange={e => setSelectedTutorId(e.target.value)} className={inputClass}>
              <option value="">Select Tutor...</option>
              {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Hourly Rate ($)</label>
              <input type="number" min="1" step="0.01" required value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value) || "")} placeholder="e.g. 50.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment Method</label>
              <select value={transactionMethod} onChange={e => setTransactionMethod(e.target.value)} className={inputClass}>
                <option value="Debit Card">Debit Card</option>
                <option value="ACH">ACH / Direct Pay</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tutoring Subject</label>
              <input placeholder="e.g. Mathematics" value={subject} onChange={e => setSubject(e.target.value)} className={inputClass} />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting || filteredLogs.length === 0} className={cx("w-full py-3 rounded-lg text-white text-sm font-bold transition-colors mt-1", filteredLogs.length > 0 && !isSubmitting ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" : "bg-gray-300 cursor-not-allowed")}>
            {isSubmitting ? "Generating..." : "Bundle " + filteredLogs.length + " Logs"}
          </button>
          {status && <div className={getStatusClass(status)}>{status}</div>}
        </div>

        <div className="bg-slate-50 rounded-xl border border-gray-200 p-5 h-fit">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Invoice Summary</h3>
          <div className="flex justify-between mb-3"><span className="text-slate-500 text-sm">Unbilled Logs:</span><span className="font-semibold text-sm">{filteredLogs.length}</span></div>
          <div className="flex justify-between mb-3"><span className="text-slate-500 text-sm">Total Hours:</span><span className="font-semibold text-sm">{totalHours}</span></div>
          <hr className="border-slate-200 my-4" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm text-gray-900">Total Amount:</span>
            <span className="font-extrabold text-2xl text-gray-900">${calculatedTotal.toFixed(2)}</span>
          </div>
          {filteredLogs.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Included Dates</h4>
              {filteredLogs.map(log => (
                <div key={log.id} className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{log.service_date}</span><span className="text-slate-400">{log.hours}h</span>
                </div>
              ))}
            </div>
          ) : (
            selectedStudentId && selectedTutorId && <p className="text-xs text-red-600 mt-4 leading-relaxed">No unbilled hours exist for this student and tutor combination.</p>
          )}
        </div>
      </form>
    </div>
  );
}