"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { TutorCredentialType } from "../../../types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function NewTutorForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [credentialType, setCredentialType] = useState<TutorCredentialType | "">("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [degreeTitle, setDegreeTitle] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [credentialFile, setCredentialFile] = useState<File | null>(null);

  const [status, setStatus] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  async function handleScan() {
    if (!credentialFile) {
      alert("Please select a file first.");
      return;
    }

    setIsScanning(true);
    setScanSuccess(false);
    setStatus("Scanning document with AI...");

    try {
      // Convert the file to base64 so we can send it to Claude
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix (e.g. "data:image/png;base64,")
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(credentialFile);
      });

      // Determine media type
      const mimeType = credentialFile.type || "application/pdf";

      // Build the message to Claude
      const prompt = `You are a credential verification assistant. Extract information from this tutor credential document and return ONLY a valid JSON object with no extra text.

Return exactly this structure:
{
  "full_name": "the person's full name or empty string",
  "degree_title": "the degree or certificate title or empty string",
  "field_of_study": "the field or subject area or empty string",
  "credential_type": "one of: High School Diploma, College (or Higher) Diploma, Teaching Certificate, Subject Matter Expert, or empty string",
  "issue_date": "YYYY-MM-DD format or empty string",
  "expiration_date": "YYYY-MM-DD format or empty string"
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: mimeType === "application/pdf" ? "document" : "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "API request failed");
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text || "";

      // Strip any accidental markdown fences before parsing
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const extracted = JSON.parse(cleaned);

      // Pre-fill whatever fields Claude found
      if (extracted.full_name) setFullName(extracted.full_name);
      if (extracted.degree_title) setDegreeTitle(extracted.degree_title);
      if (extracted.field_of_study) setFieldOfStudy(extracted.field_of_study);
      if (extracted.credential_type) setCredentialType(extracted.credential_type as TutorCredentialType);
      if (extracted.issue_date) setIssueDate(extracted.issue_date);
      if (extracted.expiration_date) setExpirationDate(extracted.expiration_date);

      setScanSuccess(true);
      setStatus("Scan complete! Review and correct any fields below.");

    } catch (err: any) {
      setStatus("Error scanning document: " + err.message);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("Saving profile...");

    let finalCredentialUrl = "";
    if (credentialFile) {
      const fileExt = credentialFile.name.split(".").pop();
      const fileName = Date.now() + "_" + fullName.replace(/\s/g, "_") + "." + fileExt;
      const { data: uploadData } = await supabase.storage
        .from("tutor-credentials")
        .upload(fileName, credentialFile);
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("tutor-credentials")
          .getPublicUrl(fileName);
        finalCredentialUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("tutors").insert({
      school_id: PROTOTYPE_SCHOOL_ID,
      full_name: fullName,
      email,
      phone,
      credential_type: credentialType,
      field_of_study: fieldOfStudy,
      degree_title: degreeTitle,
      issue_date: issueDate || null,
      credential_expiration: expirationDate || null,
      credential_url: finalCredentialUrl,
      is_active: true,
    });

    if (error) {
      setStatus("Error: " + error.message);
      setIsSubmitting(false);
    } else {
      setStatus("Success! Profile saved. Redirecting...");
      setTimeout(() => router.push("/tutors"), 1500);
    }
  }

  function getStatusClass(msg: string) {
    if (msg.includes("Error")) return "p-3 rounded-lg text-center text-sm font-semibold bg-red-50 text-red-700";
    if (msg.startsWith("Scan complete")) return "p-3 rounded-lg text-center text-sm font-semibold bg-green-50 text-green-700";
    return "p-3 rounded-lg text-center text-sm font-semibold bg-blue-50 text-blue-600";
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1";

  return (
    <div className="px-4 py-8 sm:px-8 max-w-2xl mx-auto font-sans">
      <button
        onClick={() => router.push("/tutors")}
        className="text-blue-500 font-semibold text-sm mb-6 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors"
      >
        ← Back to Roster
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Add Provider</h1>
      <p className="text-gray-500 text-sm mb-6">
        Upload credentials for automated ESA compliance mapping.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-xl border border-gray-200">

        {/* Step 1: Upload & Scan */}
        <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Step 1: Upload and Scan Credential Document
          </label>
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={e => {
                setCredentialFile(e.target.files?.[0] || null);
                setScanSuccess(false);
                setStatus("");
              }}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
            />
            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning || !credentialFile}
              className={cx(
                "w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors",
                credentialFile && !isScanning
                  ? "bg-slate-600 hover:bg-slate-700 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {isScanning ? "Scanning..." : scanSuccess ? "Scan Again" : "Scan with AI"}
            </button>
          </div>
        </div>

        {/* Status message */}
        {status && (
          <div className={getStatusClass(status)}>{status}</div>
        )}

        {/* Step 2: Review Fields */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
            Step 2: Review and Complete Profile
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div>
              <label className={labelClass}>Credential Type</label>
              <select
                required
                value={credentialType}
                onChange={e => setCredentialType(e.target.value as TutorCredentialType)}
                className={inputClass}
              >
                <option value="">Select Type...</option>
                <option value="High School Diploma">High School Diploma</option>
                <option value="College (or Higher) Diploma">College (or Higher) Diploma</option>
                <option value="Teaching Certificate">Teaching Certificate</option>
                <option value="Subject Matter Expert">Subject Matter Expert</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Degree / Certificate Title</label>
              <input
                value={degreeTitle}
                onChange={e => setDegreeTitle(e.target.value)}
                className={inputClass}
                placeholder="e.g. B.S. Mathematics"
              />
            </div>
            <div>
              <label className={labelClass}>Field of Study</label>
              <input
                value={fieldOfStudy}
                onChange={e => setFieldOfStudy(e.target.value)}
                className={inputClass}
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label className={labelClass}>Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expiration Date</label>
              <input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="tutor@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
                placeholder="(555) 000-0000"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cx(
            "w-full py-3 rounded-lg text-white text-sm font-bold transition-colors mt-1",
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-700 cursor-pointer"
          )}
        >
          {isSubmitting ? "Saving..." : "Save Verified Profile"}
        </button>

      </form>
    </div>
  );
}

///There's one setup step you need to do before this will work. In your project's root folder, find the file called `.env.local` (create it if it doesn't exist) and add this line:

NEXT_PUBLIC_ANTHROPIC_API_KEY=your_api_key_here