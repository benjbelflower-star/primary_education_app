"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function LogService() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
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
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      const sid = userData.school_id;
      setSchoolId(sid);

      const { data: studentData } = await supabase.from("students").select("id, first_name, last_name").eq("school_id", sid).eq("status", "active");
      const { data: tutorData } = await supabase.from("tutors").select("id, full_name").eq("school_id", sid).eq("is_active", true);
      if (studentData) setStudents(studentData);
      if (tutorData) setTutors(tutorData);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setIsSubmitting(true);
    setMessage("Logging service...");

    const { error } = await supabase.from("service_logs").insert({
      school_id: schoolId,
      student_id: selectedStudent,
      tutor_id: selectedTutor,
      service_date: serviceDate,
      hours: parseFloat(hours),
      service_description: description,
    });

    if (error) {
      setMessage("Error: " + error.message);
      setIsSubmitting(false);
    } else {
      setMessage("Service logged successfully!");
      setTimeout(() => router.push("/"), 1500);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 max-w-2xl mx-auto font-sans">
      <button onClick={() => router.push("/")} className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors">
        ← Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Log Service</h1>
      <p className="text-gray-500 text-sm mb-6">Record educational hours for ESA billing.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <label className={labelClass}>Student</label>
          <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={inputClass}>
            <option value="">Select a student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Provider / Tutor</label>
          <select required value={selectedTutor} onChange={e => setSelectedTutor(e.target.value)} className={inputClass}>
            <option value="">Select a provider...</option>
            {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date of Service</label>
            <input required type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total Hours</label>
            <input required type="number" step="0.25" min="0.25" value={hours} onChange={e => setHours(e.target.value)} className={inputClass} placeholder="e.g. 1.5" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Service Description</label>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className={inputClass + " resize-y"} placeholder="Describe the educational services provided..." />
        </div>

        <button type="submit" disabled={isSubmitting} className={cx("w-full py-3 rounded-lg text-white text-sm font-bold transition-colors mt-1", isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700 cursor-pointer")}>
          {isSubmitting ? "Saving..." : "Submit Log"}
        </button>

        {message && (
          <div className={message.includes("Error") ? "p-3 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700" : "p-3 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700"}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}