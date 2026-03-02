"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Added router
import { supabase } from "../../../lib/supabaseClient";

// If TutorCredentialType is throwing an error, you can temporarily use 'any' or update your types file.
import { TutorCredentialType } from "../../../types"; 

export default function NewTutorForm() {
  const router = useRouter(); // Initialize router

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

  // This function simulates calling an AI Vision API to parse the document
  async function handleScan() {
    if (!credentialFile) {
      alert("Please select a file first.");
      return;
    }
    setIsScanning(true);
    setStatus("AI is analyzing document...");

    // Simulate AI Processing Delay
    setTimeout(() => {
      // In a real implementation, this data comes from an AI API response
      setCredentialType("College (or Higher) Diploma" as any);
      setDegreeTitle("Bachelor of Science");
      setFieldOfStudy("Mathematics");
      setIssueDate("2020-05-15");
      setStatus("Scan complete! Fields auto-populated.");
      setIsScanning(false);
    }, 2000);
  }

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
      credential_expiration: expirationDate || null, // Updated to match DB column name
      credential_url: finalCredentialUrl,
      is_active: true // Ensure they show up on the active roster
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      setIsSubmitting(false);
    } else {
      setStatus("Success! Profile saved. Redirecting...");
      setTimeout(() => router.push("/tutors"), 1500); // Redirect to roster
    }
  }

  const labelStyle = { fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" };
  const inputStyle = { padding: 10, borderRadius: 6, border: "1px solid #ccc", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 40, fontFamily: "system-ui" }}>
      
      {/* Added Back Button */}
      <button 
        onClick={() => router.push("/tutors")} 
        style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: 20 }}
      >
        ← Back to Roster
      </button>

      <h1 style={{ fontSize: 28, marginBottom: 8, marginTop: 0 }}>Tutor Credential Management</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>Upload a document to automatically extract and verify credential data.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div style={{ padding: 20, backgroundColor: "#f8f9fa", borderRadius: 8, border: "1px dashed #ccc" }}>
          <label style={{...labelStyle, marginBottom: 0}}>Step 1: Upload & Scan Document</label>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input 
              type="file" 
              onChange={(e) => setCredentialFile(e.target.files?.[0] || null)}
              style={{ flex: 1 }}
            />
            <button 
              type="button" 
              onClick={handleScan}
              disabled={isScanning || !credentialFile}
              style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", borderRadius: 6, border: "none", cursor: "pointer" }}
            >
              {isScanning ? "Scanning..." : "Scan with AI"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Degree / Certificate Title</label>
            <input value={degreeTitle} onChange={(e) => setDegreeTitle(e.target.value)} style={inputStyle} placeholder="e.g. Bachelor of Science" />
          </div>
          <div>
            <label style={labelStyle}>Area of Study</label>
            <input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} style={inputStyle} placeholder="e.g. Mathematics" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Issue Date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Expiration Date (Optional)</label>
            <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: "14px", backgroundColor: "#0f172a", color: "white", borderRadius: 6, border: "none", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer", marginTop: 10 }}
        >
          {isSubmitting ? "Saving..." : "Save Verified Profile"}
        </button>

        {status && (
          <div style={{ 
            padding: 12, borderRadius: 6, textAlign: "center", fontWeight: 600,
            backgroundColor: status.includes("Error") ? "#fff5f5" : "#f0fdf4", 
            color: status.includes("Error") ? "#c53030" : "#16a34a" 
          }}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}