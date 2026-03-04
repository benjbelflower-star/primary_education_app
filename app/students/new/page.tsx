"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AddNewStudent() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (userData) setSchoolId(userData.school_id);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setIsSubmitting(true);
    setMessage("Saving student profile...");

    const { error } = await supabase.from("students").insert({
      school_id: schoolId,
      first_name: firstName,
      last_name: lastName,
      grade_level: gradeLevel,
      guardian_name: guardianName,
      guardian_email: guardianEmail,
      status: "active",
    });

    if (error) {
      setMessage("Error: " + error.message);
      setIsSubmitting(false);
    } else {
      setMessage("Student added successfully! Redirecting...");
      setTimeout(() => router.push("/students"), 1500);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 max-w-2xl mx-auto font-sans">
      <button onClick={() => router.push("/students")} className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors">
        ← Back to Roster
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add New Student</h1>
      <p className="text-gray-500 text-sm mb-6">Create a new student profile for ESA tracking.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name</label>
            <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Grade Level</label>
          <select required value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className={inputClass}>
            <option value="">Select Grade...</option>
            <option value="Kindergarten">Kindergarten</option>
            <option value="1st Grade">1st Grade</option>
            <option value="2nd Grade">2nd Grade</option>
            <option value="3rd Grade">3rd Grade</option>
            <option value="4th Grade">4th Grade</option>
            <option value="5th Grade">5th Grade</option>
            <option value="6th Grade">6th Grade</option>
            <option value="7th Grade">7th Grade</option>
            <option value="8th Grade">8th Grade</option>
            <option value="9th Grade">9th Grade</option>
            <option value="10th Grade">10th Grade</option>
            <option value="11th Grade">11th Grade</option>
            <option value="12th Grade">12th Grade</option>
          </select>
        </div>

        <div className="bg-slate-50 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Guardian Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Guardian Name</label>
              <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputClass} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className={labelClass}>Guardian Email</label>
              <input type="email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} className={inputClass} placeholder="jane.doe@example.com" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cx("w-full py-3 rounded-lg text-white text-sm font-bold transition-colors mt-1", isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700 cursor-pointer")}
        >
          {isSubmitting ? "Saving..." : "Create Student"}
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