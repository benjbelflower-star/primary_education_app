"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

// ─── Constants (shared with new/page.tsx) ──────────────────────────────────────

const GRADE_LEVELS = [
  "Kindergarten",
  "1st", "2nd", "3rd", "4th", "5th", "6th",
  "7th", "8th", "9th", "10th", "11th", "12th",
];

const COMMON_LANGUAGES = [
  "English", "Spanish", "Portuguese", "French", "Mandarin",
  "Arabic", "Somali", "Tagalog", "Vietnamese", "Russian", "Other",
];

const CLASSIFICATION_PRESETS = [
  "IEP", "504 Plan", "ELL", "Gifted", "At-Risk",
  "ADHD", "Autism Spectrum", "Learning Disability",
  "Speech/Language", "Behavioral Support", "Physical Disability",
];

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type StaffOption = { id: string; label: string };
type UserOption  = { id: string; label: string };

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

// ─── Classification tag input ──────────────────────────────────────────────────

function ClassificationInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState("");

  function add(tag: string) {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setCustomInput("");
  }

  function remove(tag: string) {
    onChange(value.filter(t => t !== tag));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {CLASSIFICATION_PRESETS.map(p => {
          const active = value.includes(p);
          return (
            <button key={p} type="button" onClick={() => active ? remove(p) : add(p)}
              className={cx(
                "px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-colors",
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
              )}>
              {active ? "✓ " : ""}{p}
            </button>
          );
        })}
      </div>

      {value.filter(t => !CLASSIFICATION_PRESETS.includes(t)).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.filter(t => !CLASSIFICATION_PRESETS.includes(t)).map(tag => (
            <span key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {tag}
              <button type="button" onClick={() => remove(tag)}
                className="ml-0.5 text-indigo-400 hover:text-indigo-700 bg-transparent border-none cursor-pointer p-0 leading-none">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input type="text" value={customInput} onChange={e => setCustomInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(customInput); } }}
        placeholder="Type a custom classification and press Enter"
        className={inputCls} />
    </div>
  );
}

// ─── Photo picker ──────────────────────────────────────────────────────────────

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
  const bgColor  = avatarColor((firstName + lastName) || "S");
  const initials = ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={() => inputRef.current?.click()}
        className="relative cursor-pointer group border-none bg-transparent p-0"
        aria-label="Upload student photo">
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: preview ? "transparent" : bgColor,
          border: "3px dashed #cbd5e1", display: "flex",
          alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative",
        }}>
          {preview ? (
            <img src={preview} alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 700, color: "white", letterSpacing: 1 }}>
              {initials}
            </span>
          )}
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0, transition: "opacity 0.15s",
          }} className="group-hover:opacity-100">
            <span style={{ fontSize: 22 }}>📷</span>
          </div>
        </div>
      </button>
      <p className="text-xs text-gray-400">{preview ? "Click to change photo" : "Click to upload photo"}</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EditStudentPage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [schoolId,        setSchoolId]        = useState<string | null>(null);
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [preferredName,   setPreferredName]   = useState("");
  const [gradeLevel,      setGradeLevel]      = useState("");
  const [status,          setStatus]          = useState("active");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [homeroomStaffId, setHomeroomStaffId] = useState("");
  const [advisorId,       setAdvisorId]       = useState("");
  const [classifications, setClassifications] = useState<string[]>([]);
  const [guardianName,    setGuardianName]    = useState("");
  const [guardianEmail,   setGuardianEmail]   = useState("");

  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoFile,        setPhotoFile]        = useState<File | null>(null);
  const [photoPreview,     setPhotoPreview]     = useState<string | null>(null);

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [userOptions,  setUserOptions]  = useState<UserOption[]>([]);

  const [loading,      setLoading]      = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase
        .from("users").select("school_id").eq("id", user.id).single();
      if (!userData) return;
      const sid = userData.school_id;
      setSchoolId(sid);

      const [{ data: studentData }, { data: staffData }, { data: usersData }] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .eq("id", id as string)
          .single(),

        supabase
          .from("staff")
          .select("id, first_name, last_name, role_type")
          .eq("school_id", sid)
          .eq("employment_status", "active")
          .order("last_name"),

        supabase
          .from("users")
          .select("id, first_name, last_name")
          .eq("school_id", sid)
          .order("last_name"),
      ]);

      if (studentData) {
        const s = studentData as any;
        setFirstName(s.first_name ?? "");
        setLastName(s.last_name ?? "");
        setPreferredName(s.preferred_name ?? "");
        setGradeLevel(s.grade_level ?? "");
        setStatus(s.status ?? "active");
        setPrimaryLanguage(s.primary_language ?? "");
        setHomeroomStaffId(s.homeroom_staff_id ?? "");
        setAdvisorId(s.advisor_id ?? "");
        setClassifications(s.classifications ?? []);
        setGuardianName(s.guardian_name ?? "");
        setGuardianEmail(s.guardian_email ?? "");
        setExistingPhotoUrl(s.photo_url ?? null);
        setPhotoPreview(s.photo_url ?? null);
      }

      setStaffOptions(
        (staffData ?? []).map((s: any) => ({
          id: s.id,
          label: `${s.first_name} ${s.last_name} (${s.role_type})`,
        }))
      );
      setUserOptions(
        (usersData ?? []).map((u: any) => ({
          id: u.id,
          label: `${u.first_name} ${u.last_name}`,
        }))
      );

      setLoading(false);
    }
    load();
  }, [id]);

  function handlePhotoFile(file: File) {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile || !id) return existingPhotoUrl;
    const ext  = photoFile.name.split(".").pop() ?? "jpg";
    const path = `${id}/profile.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("student-photos")
      .upload(path, photoFile, { upsert: true });
    if (uploadErr) {
      console.warn("Photo upload failed:", uploadErr.message);
      return existingPhotoUrl;
    }
    const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const photoUrl = await uploadPhoto();

    const { error: updateErr } = await supabase
      .from("students")
      .update({
        first_name:       firstName.trim(),
        last_name:        lastName.trim(),
        preferred_name:   preferredName.trim() || null,
        grade_level:      gradeLevel || null,
        status,
        primary_language:   primaryLanguage || null,
        homeroom_staff_id:  homeroomStaffId || null,
        advisor_id:         advisorId || null,
        classifications,
        guardian_name:      guardianName.trim() || null,
        guardian_email:     guardianEmail.trim() || null,
        photo_url:          photoUrl,
      })
      .eq("id", id as string);

    if (updateErr) {
      setError("Error saving: " + updateErr.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Student file updated.");
    setTimeout(() => router.push("/students/" + id), 1000);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading student data...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto font-sans">

      <button onClick={() => router.push("/students/" + id)}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block">
        ← Back to Profile
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Student File</h1>
        <p className="text-sm text-gray-400 mt-1">{firstName} {lastName}</p>
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
        <Section title="Student Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
              <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-red-400">*</span></label>
              <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Preferred / Nickname</label>
            <input type="text" value={preferredName} onChange={e => setPreferredName(e.target.value)}
              className={inputCls} placeholder="Used as display name if set" />
          </div>
        </Section>

        {/* Enrollment */}
        <Section title="Enrollment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Grade Level</label>
              <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className={inputCls}>
                <option value="">Select grade...</option>
                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Enrollment Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>
          </div>
        </Section>

        {/* SIS info */}
        <Section title="Student Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Primary Language</label>
              <select value={primaryLanguage} onChange={e => setPrimaryLanguage(e.target.value)} className={inputCls}>
                <option value="">Select language...</option>
                {COMMON_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Homeroom Teacher</label>
              <select value={homeroomStaffId} onChange={e => setHomeroomStaffId(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {staffOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Advisor</label>
              <select value={advisorId} onChange={e => setAdvisorId(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {userOptions.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Classifications */}
        <Section title="Student Classifications">
          <p className="text-xs text-gray-400 -mt-1">
            Select from presets or type a custom classification and press Enter.
          </p>
          <ClassificationInput value={classifications} onChange={setClassifications} />
        </Section>

        {/* Guardian */}
        <Section title="Guardian Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Primary Guardian Name</label>
              <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)}
                className={inputCls} placeholder="Jane Doe" />
            </div>
            <div>
              <label className={labelCls}>Guardian Email</label>
              <input type="email" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)}
                className={inputCls} placeholder="jane@example.com" />
            </div>
          </div>
        </Section>

        {/* Feedback */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">{success}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => router.push("/students/" + id)}
            className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className={cx(
              "flex-1 py-3 rounded-lg text-white text-sm font-bold transition-colors",
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700 cursor-pointer"
            )}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </form>
    </div>
  );
}
