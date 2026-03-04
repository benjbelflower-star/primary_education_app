"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function EditTutorForm() {
  const { id } = useParams();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [credentialType, setCredentialType] = useState("");
  const [degreeTitle, setDegreeTitle] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadTutor() {
      const { data, error } = await supabase
        .from("tutors")
        .select("*")
        .eq("id", id)
        .single();

      if (data && !error) {
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setCredentialType(data.credential_type || "");
        setDegreeTitle(data.degree_title || "");
        setFieldOfStudy(data.field_of_study || "");
        setExpirationDate(data.credential_expiration || "");
        setHourlyRate(data.hourly_rate?.toString() || "");
        setIsActive(data.is_active ?? true);
      }
      setLoading(false);
    }
    loadTutor();
  }, [id]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from("tutors")
      .update({
        full_name: fullName,
        email,
        phone,
        credential_type: credentialType,
        degree_title: degreeTitle,
        field_of_study: fieldOfStudy,
        credential_expiration: expirationDate || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        is_active: isActive,
      })
      .eq("id", id);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Tutor profile updated successfully.");
      setTimeout(() => router.push("/tutors/" + id), 1500);
    }
    setIsSubmitting(false);
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading tutor profile...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 max-w-2xl mx-auto font-sans">
      <button
        onClick={() => router.push("/tutors/" + id)}
        className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors"
      >
        Back to Profile
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Tutor Profile</h1>
      <p className="text-gray-400 text-xs mb-6">ID: {id}</p>

      <form onSubmit={handleUpdate} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 flex flex-col gap-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full Name</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={isActive ? "active" : "inactive"} onChange={e => setIsActive(e.target.value === "active")} className={inputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <label className={labelClass}>Credential Type</label>
          <select required value={credentialType} onChange={e => setCredentialType(e.target.value)} className={inputClass}>
            <option value="">Select Type...</option>
            <option value="High School Diploma">High School Diploma</option>
            <option value="College (or Higher) Diploma">College (or Higher) Diploma</option>
            <option value="Teaching / Substitute Teaching Certificate - AZ State">Teaching Certificate</option>
            <option value="Subject-Specific degree">Subject-Specific Degree</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Degree Title</label>
            <input value={degreeTitle} onChange={e => setDegreeTitle(e.target.value)} className={inputClass} placeholder="e.g. Bachelor of Science" />
          </div>
          <div>
            <label className={labelClass}>Area of Study</label>
            <input value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} className={inputClass} placeholder="e.g. Mathematics" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Expiration Date</label>
            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Hourly Rate ($)</label>
            <input type="number" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className={inputClass} placeholder="e.g. 50.00" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cx(
              "flex-1 py-3 rounded-lg text-white text-sm font-bold transition-colors",
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            )}
          >
            {isSubmitting ? "Saving..." : "Update Tutor"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/tutors/" + id)}
            className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>

        {message && (
          <div className={message.includes("Error") ? "p-3 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700" : "p-3 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700"}>
            {message}
          </div>
        )}

      </form>
    </div>
  );
}