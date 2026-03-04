"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Tutor } from "../../types";
import Link from "next/link";

export default function TutorManagement() {
  const router = useRouter();
  const [tutors, setTutors] = useState<(Tutor & { invoice_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;

      const { data: tutorData } = await supabase
        .from("tutors")
        .select("*, invoices(id)")
        .eq("school_id", userData.school_id)
        .order("full_name");

      if (tutorData) {
        setTutors(tutorData.map(t => ({ ...t, invoice_count: t.invoices?.length || 0 })) as any);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function toggleStatus(tutor: any) {
    const { error } = await supabase.from("tutors").update({ is_active: !tutor.is_active }).eq("id", tutor.id);
    if (!error) setTutors(prev => prev.map(t => t.id === tutor.id ? { ...t, is_active: !t.is_active } : t));
  }

  function getCredentialStatus(expirationDate: string | null | undefined) {
    if (!expirationDate) return { text: "No Expiration", color: "text-slate-500", bg: "bg-slate-100" };
    const diffDays = Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "Expired", color: "text-red-700", bg: "bg-red-50" };
    if (diffDays <= 30) return { text: "Expires in " + diffDays + "d", color: "text-yellow-700", bg: "bg-yellow-50" };
    return { text: "Valid", color: "text-green-700", bg: "bg-green-50" };
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading providers...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-4xl mx-auto font-sans">
      <button onClick={() => router.push("/")} className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block">
        ← Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutors</h1>
          <p className="text-gray-400 text-sm mt-0.5">ESA Compliance Roster</p>
        </div>
        <Link href="/tutors/new" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">
          + Add
        </Link>
      </div>

      {/* Mobile */}
      <div className="block md:hidden bg-white rounded-xl border border-gray-200">
        {tutors.map(t => {
          const c = getCredentialStatus(t.credential_expiration);
          return (
            <div key={t.id} onClick={() => router.push("/tutors/" + t.id)} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{t.full_name}</div>
                <div className="text-xs text-gray-400 truncate">{t.credential_type}</div>
              </div>
              <span className={"ml-3 px-2 py-0.5 rounded-full text-xs font-bold " + c.bg + " " + c.color}>{c.text}</span>
              <span className="ml-2 text-gray-300 text-lg">›</span>
            </div>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Provider</th>
              <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compliance</th>
              <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoices</th>
              <th className="px-2 py-3 pr-5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map(t => {
              const c = getCredentialStatus(t.credential_expiration);
              return (
                <tr key={t.id} className={"border-b border-gray-50 hover:bg-gray-50 transition-colors" + (t.is_active ? "" : " opacity-50")}>
                  <td className="px-5 py-3">
                    <Link href={"/tutors/" + t.id} className="font-semibold text-blue-600 hover:text-blue-800 text-sm">{t.full_name}</Link>
                    <div className="text-xs text-gray-400">{t.credential_type}</div>
                  </td>
                  <td className="px-2 py-3">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-bold " + c.bg + " " + c.color}>{c.text}</span>
                  </td>
                  <td className="px-2 py-3 text-sm text-gray-600">{t.invoice_count}</td>
                  <td className="px-2 py-3 pr-5 text-right">
                    <button onClick={() => toggleStatus(t)} className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                      {t.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}