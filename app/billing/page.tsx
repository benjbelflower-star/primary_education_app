"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { BillingAccount, Student } from "../../types";
import Link from "next/link";

type BillingAccountWithStudents = BillingAccount & { students: Student[] };

export default function BillingManagement() {
  const [accounts, setAccounts] = useState<BillingAccountWithStudents[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;

      const { data, error } = await supabase
        .from("billing_accounts")
        .select("*, students (*)")
        .eq("school_id", userData.school_id)
        .order("guardian_name");

      if (data && !error) setAccounts(data as BillingAccountWithStudents[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading billing registry...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Guardian Management</h1>
        <Link href="/billing/new" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">
          + New Account
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="font-bold text-gray-900">{acc.guardian_name}</span>
              <span className={acc.status === "active" ? "text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700" : "text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700"}>
                {acc.status}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              <div>{acc.email || "No email on file"}</div>
              <div>{acc.phone || "No phone on file"}</div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Linked Students</div>
              {acc.students && acc.students.length > 0 ? (
                acc.students.map(s => (
                  <div key={s.id} className="text-sm text-gray-700 py-0.5">
                    {s.first_name} {s.last_name} (Grade: {s.grade_level})
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-300 italic">No students linked</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}