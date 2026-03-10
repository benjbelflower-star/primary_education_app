"use client";

import RoleGuard from "../../../../components/RoleGuard";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Tutor } from "../../../types";
import Link from "next/link";

type ComplianceTutor = Tutor & {
  daysRemaining: number | null;
  complianceStatus: "expired" | "warning" | "valid";
};

function TutorComplianceReportInner() {
  const router = useRouter();
  const [tutors, setTutors] = useState<ComplianceTutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;

      const { data, error } = await supabase.from("tutors").select("*").eq("school_id", userData.school_id);

      if (data && !error) {
        const now = new Date();
        const processed = data.map(t => {
          let daysRemaining = null;
          let complianceStatus: "expired" | "warning" | "valid" = "valid";
          if (t.credential_expiration) {
            const exp = new Date(t.credential_expiration);
            daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysRemaining < 0) complianceStatus = "expired";
            else if (daysRemaining <= 30) complianceStatus = "warning";
          }
          return { ...t, daysRemaining, complianceStatus } as ComplianceTutor;
        });
        processed.sort((a, b) => ({ expired: 0, warning: 1, valid: 2 }[a.complianceStatus] - { expired: 0, warning: 1, valid: 2 }[b.complianceStatus]));
        setTutors(processed);
      }
      setLoading(false);
    }
    load();
  }, []);

  function getStatusClass(status: "expired" | "warning" | "valid") {
    if (status === "expired") return "px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-red-50 text-red-700";
    if (status === "warning") return "px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-yellow-50 text-yellow-700";
    return "px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-teal-50 text-teal-700";
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Generating compliance audit...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-5xl mx-auto font-sans">
      <button
        onClick={() => router.push("/")}
        className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Tutor Compliance Report</h1>
      <p className="text-gray-500 text-sm mb-6">Monitor credential expiration across your tutoring staff.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Expired", status: "expired", color: "text-red-600" },
          { label: "Expiring (30 days)", status: "warning", color: "text-yellow-600" },
          { label: "Valid", status: "valid", color: "text-teal-600" },
        ].map(({ label, status, color }) => (
          <div key={status} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
            <div className={"text-3xl font-extrabold " + color}>
              {tutors.filter(t => t.complianceStatus === status).length}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tutor Name</th>
              <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credential Type</th>
              <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiration</th>
              <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-2 py-3 pr-5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Link href={"/tutors/" + t.id} className="text-blue-600 font-semibold text-sm hover:text-blue-800">
                    {t.full_name}
                  </Link>
                </td>
                <td className="px-2 py-3 text-sm text-gray-600">{t.credential_type}</td>
                <td className="px-2 py-3 text-sm text-gray-600">{t.credential_expiration || "N/A"}</td>
                <td className="px-2 py-3"><span className={getStatusClass(t.complianceStatus)}>{t.complianceStatus}</span></td>
                <td className="px-2 py-3 pr-5 text-sm text-gray-600 text-right">{t.daysRemaining !== null ? t.daysRemaining : "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TutorComplianceReport() {
  return (
    <RoleGuard allowedRoles={["admin", "finance"]}>
      <TutorComplianceReportInner />
    </RoleGuard>
  );
}
