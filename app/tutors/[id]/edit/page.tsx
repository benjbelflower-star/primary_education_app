"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

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
        setExpirationDate(data.expiration_date || "");
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
        email: email,
        phone: phone,
        credential_type: credentialType,
        degree_title: degreeTitle,
        field_of_study: fieldOfStudy,
        expiration_date: expirationDate || null,
        is_active: isActive
      })
      .eq("id", id);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Tutor profile updated successfully.");
      setTimeout(() => router.push(`/tutors/${id}`), 1500);
    }
    setIsSubmitting(false);
  }

  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: "14px", display: "block", marginBottom: "4px" };
  const inputStyle: React.CSSProperties = { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" };

  if (loading) return <div style={{ padding: 60 }}>Loading tutor profile...</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 60, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Edit Tutor Profile</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>ID: {id}</p>

      <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={isActive ? "active" : "inactive"} onChange={e => setIsActive(e.target.value === "active")} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "10px 0" }} />

        <div>
          <label style={labelStyle}>Credential Type</label>
          <select required value={credentialType} onChange={e => setCredentialType(e.target.value)} style={inputStyle}>
            <option value="">Select Type...</option>
            <option value="High School Diploma">High School Diploma</option>
            <option value="College (or Higher) Diploma">College (or Higher) Diploma</option>
            <option value="Teaching / Substitute Teaching Certificate - AZ State">Teaching Certificate</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Degree Title</label>
            <input value={degreeTitle} onChange={e => setDegreeTitle(e.target.value)} style={inputStyle} placeholder="e.g. Bachelor of Science" />
          </div>
          <div>
            <label style={labelStyle}>Area of Study</label>
            <input value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} style={inputStyle} placeholder="e.g. Mathematics" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Expiration Date</label>
          <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              flex: 1, padding: "12px", backgroundColor: "#007bff", color: "white", 
              border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" 
            }}
          >
            {isSubmitting ? "Saving..." : "Update Tutor"}
          </button>
          <button 
            type="button" 
            onClick={() => router.push(`/tutors/${id}`)}
            style={{ 
              padding: "12px 24px", backgroundColor: "white", color: "#333", 
              border: "1px solid #ccc", borderRadius: "6px", fontWeight: 600, cursor: "pointer" 
            }}
          >
            Cancel
          </button>
        </div>

        {message && (
          <div style={{ 
            marginTop: "10px", padding: "12px", borderRadius: "6px", textAlign: "center",
            backgroundColor: message.includes("Error") ? "#fff5f5" : "#f0fdf4",
            color: message.includes("Error") ? "#c53030" : "#2c7a7b",
            border: "1px solid"
          }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}