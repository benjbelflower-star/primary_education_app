"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { TutorCredentialType } from "../../../types"; 

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

  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016"; 

  // --- PASTE YOUR ORIGINAL OCR FUNCTION HERE ---
  async function handleScan() {
    if (!credentialFile) {
      alert("Please select a file first.");
      return;
    }
    setIsScanning(true);
    setStatus("Scanning document...");

    // Your custom AI extraction logic goes here.
    // Example: const extractedData = await myOcrService(credentialFile);
    // setFullName(extractedData.name);
    
    setIsScanning(false);
  }
  // ---------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("Saving profile...");

    let finalCredentialUrl = "";
    if (credentialFile) {
      const fileExt = credentialFile.name.split('.').pop();
      const fileName = `${Date.now()}_${fullName.replace(/\s/g, '_')}.${fileExt}`;
      const { data: uploadData } = await supabase.storage.from('tutor-credentials').upload(fileName, credentialFile);
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('tutor-credentials').getPublicUrl(fileName);
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
      is_active: true
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      setIsSubmitting(false);
    } else {
      setStatus("Success! Profile saved. Redirecting...");
      setTimeout(() => router.push("/tutors"), 1500);
    }
  }

  const labelStyle = { fontWeight: 600, fontSize: 13, marginBottom: 6, display: "block", color: "#475569", textTransform: "uppercase" as const };
  const inputStyle = { padding: "12px", borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" as const, fontSize: "15px" };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px", fontFamily: "system-ui" }}>
      <button onClick={() => router.push("/tutors")} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: "24px" }}>
        ← Back to Roster
      </button>

      <h1 style={{ fontSize: "28px", margin: "0 0 8px 0", color: "#0f172a" }}>Add Provider</h1>
      <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "14px" }}>Upload credentials for automated ESA compliance mapping.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        
        <div style={{ padding: "16px", backgroundColor: "#f8f9fa", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
          <label style={{...labelStyle, marginBottom: 8}}>Step 1: Upload & Scan Document</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input type="file" onChange={(e) => setCredentialFile(e.target.files?.[0] || null)} style={{ width: "100%", boxSizing: "border-box" }} />
            <button type="button" onClick={handleScan} disabled={isScanning || !credentialFile} style={{ padding: "10px", backgroundColor: "#64748b", color: "white", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
              {isScanning ? "Scanning..." : "Scan with AI"}
            </button>
          </div>
        </div>

        {/* Responsive Grid applied here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Full Name</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Credential Type</label>
            <select required value={credentialType} onChange={(e) => setCredentialType(e.target.value as any)} style={inputStyle}>
              <option value="">Select Type...</option>
              <option value="High School Diploma">High School Diploma</option>
              <option value="College (or Higher) Diploma">College (or Higher) Diploma</option>
              <option value="Teaching Certificate">Teaching Certificate</option>
              <option value="Subject Matter Expert">Subject Matter Expert</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Degree / Certificate Title</label>
            <input value={degreeTitle} onChange={(e) => setDegreeTitle(e.target.value)} style={inputStyle} placeholder="e.g. B.S. Mathematics" />
          </div>
          <div>
            <label style={labelStyle}>Expiration Date</label>
            <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} style={{ padding: "14px", backgroundColor: "#0f172a", color: "white", borderRadius: 8, border: "none", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: "8px", fontSize: "16px" }}>
          {isSubmitting ? "Saving..." : "Save Verified Profile"}
        </button>

        {status && (
          <div style={{ padding: "12px", borderRadius: 6, textAlign: "center", fontWeight: 600, backgroundColor: status.includes("Error") ? "#fff5f5" : "#f0fdf4", color: status.includes("Error") ? "#c53030" : "#16a34a" }}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}