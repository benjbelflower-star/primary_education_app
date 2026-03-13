"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLE_TYPES = [
  "Homeroom Teacher",
  "Special Education Teacher",
  "Speech Therapist",
  "Occupational Therapist",
  "Physical Therapist",
  "Counselor",
  "Aide / Paraprofessional",
  "Administrator",
  "Other",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

// ─── Photo picker ──────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function PhotoPicker({
  firstName,
  lastName,
  preview,
  onFile,
}: {
  firstName: string;
  lastName: string;
  preview: string | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bgColor = avatarColor((firstName + lastName) || "T");
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative cursor-pointer group border-none bg-transparent p-0"
        aria-label="Upload teacher photo"
      >
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: preview ? "transparent" : bgColor,
          border: "3px dashed #cbd5e1",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative",
        }}>
          {preview ? (
            <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 700, color: "white", letterSpacing: 1 }}>
              {initials}
            </span>
          )}
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.15s",
          }}
            className="group-hover:opacity-100">
            <span style={{ fontSize: 22 }}>📷</span>
          </div>
        </div>
      </button>
      <p className="text-xs text-gray-400">{preview ? "Click to change photo" : "Click to upload photo"}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AddNewTeacher() {
  const router = useRouter();

  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Form fields
  const [firstName,        setFirstName]        = useState("");
  const [lastName,         setLastName]         = useState("");
  const [roleType,         setRoleType]         = useState("");
  const [email,            setEmail]            = useState("");
  const [phone,            setPhone]            = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("active");

  // Photo
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase.from("users").select("school_id").eq("id", user.id).single();
      if (userData) setSchoolId(userData.school_id);
    }
    load();
  }, []);

  function handlePhotoFile(file: File) {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(staffId: string): Promise<string | null> {
    if (!photoFile) return null;
    const ext  = photoFile.name.split(".").pop() ?? "jpg";
    const path = `${staffId}/profile.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("staff-photos")
      .upload(path, photoFile, { upsert: true });
    if (uploadErr) {
      console.warn("Photo upload failed:", uploadErr.message);
      return null;
    }
    const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    const { data: newStaff, error: insertErr } = await supabase
      .from("staff")
      .insert({
        school_id:         schoolId,
        first_name:        firstName.trim(),
        last_name:         lastName.trim(),
        role_type:         roleType || null,
        email:             email.trim() || null,
        phone:             phone.trim() || null,
        employment_status: employmentStatus,
      })
      .select("id")
      .single();

    if (insertErr || !newStaff) {
      setError("Error creating staff member: " + (insertErr?.message ?? "unknown error"));
      setIsSubmitting(false);
      return;
    }

    const staffId = newStaff.id;

    if (photoFile) {
      const photoUrl = await uploadPhoto(staffId);
      if (photoUrl) {
        await supabase.from("staff").update({ photo_url: photoUrl }).eq("id", staffId);
      }
    }

    router.push("/teachers/" + staffId);
  }

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto font-sans">

      <button
        onClick={() => router.push("/teachers")}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Staff Roster
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Teacher</h1>
        <p className="text-sm text-gray-400 mt-1">Creates a permanent staff file.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Photo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex justify-center">
          <PhotoPicker
            firstName={firstName}
            lastName={lastName}
            preview={photoPreview}
            onFile={handlePhotoFile}
          />
        </div>

        {/* Identity */}
        <Section title="Staff Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
              <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className={inputCls} placeholder="Jane" />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
              <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className={inputCls} placeholder="Smith" />
            </div>
          </div>
        </Section>

        {/* Role */}
        <Section title="Role & Status">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Role Type</label>
              <select value={roleType} onChange={e => setRoleType(e.target.value)} className={inputCls}>
                <option value="">Select role...</option>
                {ROLE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Employment Status</label>
              <select value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value)} className={inputCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputCls} placeholder="teacher@school.edu" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className={inputCls} placeholder="(555) 000-0000" />
            </div>
          </div>
        </Section>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.push("/teachers")}
            className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !schoolId}
            className={cx(
              "flex-1 py-3 rounded-lg text-white text-sm font-bold transition-colors",
              isSubmitting || !schoolId
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-700 cursor-pointer"
            )}
          >
            {isSubmitting ? "Creating staff file..." : "Create Staff File"}
          </button>
        </div>

      </form>
    </div>
  );
}
