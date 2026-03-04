"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Student } from "../../../types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function NewBillingAccount() {
  const router = useRouter();
  const [guardianName, setGuardianName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      setSchoolId(userData.school_id);

      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade_level")
        .eq("school_id", userData.school_id)
        .is("billing_account_id", null);

      if (data) setAvailableStudents(data as Student[]);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setIsSubmitting(true);
    setStatus("Creating account...");

    try {
      const { data: account, error: accError } = await supabase
        .from("billing_accounts")
        .insert({ school_id: schoolId, guardian_name: guardianName, email, phone, status: "active" })
        .select()
        .single();

      if (accError) throw accError;

      if (selectedStudentIds.length > 0) {
        const { error: linkError } = await supabase
          .from("students")
          .update({ billing_account_id: account.id })
          .in("id", selectedStudentIds);
        if (linkError) throw linkError;
      }

      setStatus("Success: Billing account created and students linked.");
      setGuardianName(""); setEmail(""); setPhone(""); setSelectedStudentIds([]);
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 max-w-2xl mx-auto font-sans">
      <button
        onClick={() => router.push("/billing")}
        className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Billing
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New Billing Account</h1>
      <p className="text-gray-500 text-sm mb-6">Create a guardian profile to manage ClassWallet payments.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <label className={labelClass}>Guardian Full Name</label>
          <input required value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputClass} placeholder="e.g. Robert Smith" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="robert@example.com" />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(555) 000-0000" />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <label className={labelClass}>Link Students</label>
          <p className="text-xs text-gray-400 mb-3">Select the students this guardian is responsible for.</p>
          <div className="max-h-40 overflow-y-auto flex flex-col gap-2">
            {availableStudents.map(s => (
              <label key={s.id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(s.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                    else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                  }}
                />
                {s.first_name} {s.last_name} (Grade: {s.grade_level})
              </label>
            ))}
            {availableStudents.length === 0 && (
              <p className="text-sm text-gray-300">No unlinked students found.</p>
            )}
          </div>
        </div>

        <button
          disabled={isSubmitting}
          className={cx(
            "w-full py-3 rounded-lg text-white text-sm font-bold transition-colors",
            isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
          )}
        >
          {isSubmitting ? "Saving..." : "Create Account & Link Students"}
        </button>

        {status && (
          <div className={status.includes("Error") ? "p-3 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700" : "p-3 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700"}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}