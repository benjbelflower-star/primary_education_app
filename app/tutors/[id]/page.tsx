"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { Tutor, Invoice } from "../../../types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function TutorDetailView() {
  const { id } = useParams();
  const router = useRouter();

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTutorData() {
      if (!id) return;

      const { data: tutorData } = await supabase
        .from("tutors")
        .select("*")
        .eq("id", id)
        .single();

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*, students (first_name, last_name, grade_level)")
        .eq("tutor_id", id)
        .order("issue_date", { ascending: false });

      if (tutorData) setTutor(tutorData as Tutor);
      if (invoiceData) setInvoices(invoiceData as any);
      setLoading(false);
    }
    loadTutorData();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Loading tutor profile...</p>
    </div>
  );

  if (!tutor) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Tutor not found.</p>
    </div>
  );

  const isExpired =
    tutor.credential_expiration &&
    new Date(tutor.credential_expiration) < new Date();

  const statusBadgeClass = cx(
    "px-3 py-1 rounded-full text-xs font-bold",
    tutor.is_active ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"
  );

  const expirationClass = cx(
    "text-sm font-medium",
    isExpired ? "text-red-600" : "text-gray-700"
  );

  function getInvoiceStatusClass(status: string) {
    if (status === "paid") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700";
    if (status === "overdue") return "px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700";
    return "px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700";
  }

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-5xl mx-auto font-sans">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <button
            onClick={() => router.push("/tutors")}
            className="text-blue-500 font-semibold text-sm mb-3 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
          >
            ← Back to Roster
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {tutor.full_name}
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={statusBadgeClass}>
              {tutor.is_active ? "Active" : "Inactive"}
            </span>
            <span className="text-gray-500 text-sm">{tutor.credential_type}</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/tutors/" + id + "/edit")}
          className="w-full sm:w-auto px-5 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Edit Profile
        </button>
      </div>

      {/* Main grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-6">

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Invoiced Sessions
          </h3>
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No invoices have been generated for this tutor yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:-mx-6">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-left">
                    <th className="px-5 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inv #</th>
                    <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                    <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-2 py-3 pr-5 sm:pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} onClick={() => router.push("/invoices/" + inv.id)} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 sm:px-6 py-3 text-sm text-gray-800">{inv.invoice_number}</td>
                      <td className="px-2 py-3 text-sm text-gray-800">
                        {inv.students.first_name} {inv.students.last_name}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-600">{inv.issue_date}</td>
                      <td className="px-2 py-3 pr-5 sm:pr-6">
                        <span className={getInvoiceStatusClass(inv.status)}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Credential Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Credential Details
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                Degree / Title
              </div>
              <div className="text-sm font-semibold text-gray-800">
                {tutor.degree_title || "Not recorded"}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                Area of Study
              </div>
              <div className="text-sm text-gray-700">
                {tutor.field_of_study || "Not recorded"}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                Expiration Date
              </div>
              <div className={expirationClass}>
                {tutor.credential_expiration || "No expiration"}
                {isExpired && (
                  <span className="ml-2 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                    Expired
                  </span>
                )}
              </div>
            </div>
            {tutor.credential_url && (
              <a
                href={tutor.credential_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                View Credential PDF
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}