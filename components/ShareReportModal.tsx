"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

type SystemRecipient = {
  id: string;
  type: "user" | "guardian";
  name: string;
  email: string;
  role?: string;
};

export function ShareReportModal({
  reportId,
  reportName,
  schoolId,
  onClose,
}: {
  reportId: string;
  reportName: string;
  schoolId: string;
  onClose: () => void;
}) {
  const [search,     setSearch]     = useState("");
  const [candidates, setCandidates] = useState<SystemRecipient[]>([]);
  const [existing,   setExisting]   = useState<SystemRecipient[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [sharing,    setSharing]    = useState<string | null>(null);
  const [removing,   setRemoving]   = useState<string | null>(null);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("report_shares")
        .select("id, recipient_user_id, recipient_guardian_id, recipient_name, recipient_email")
        .eq("saved_report_id", reportId);
      if (data) {
        setExisting((data as any[]).map(r => ({
          id: r.recipient_user_id ?? r.recipient_guardian_id,
          type: r.recipient_user_id ? "user" : "guardian",
          name: r.recipient_name,
          email: r.recipient_email,
        })));
      }
    })();
  }, [reportId]);

  useEffect(() => {
    if (search.trim().length < 2) { setCandidates([]); return; }
    const q = search.trim();
    setLoading(true);
    const timer = setTimeout(async () => {
      const [{ data: users }, { data: guardians }] = await Promise.all([
        supabase.from("users")
          .select("id, first_name, last_name, email")
          .eq("school_id", schoolId)
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(10),
        supabase.from("guardians")
          .select("id, first_name, last_name, email")
          .eq("school_id", schoolId)
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(10),
      ]);
      setCandidates([
        ...((users ?? []) as any[]).map(u => ({
          id: u.id, type: "user" as const,
          name: `${u.first_name} ${u.last_name}`.trim(),
          email: u.email ?? "", role: "Staff",
        })),
        ...((guardians ?? []) as any[]).map(g => ({
          id: g.id, type: "guardian" as const,
          name: `${g.first_name} ${g.last_name}`.trim(),
          email: g.email ?? "", role: "Guardian",
        })),
      ]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, schoolId]);

  async function share(rec: SystemRecipient) {
    if (existing.some(e => e.id === rec.id)) return;
    setSharing(rec.id); setShareError("");
    const payload: Record<string, unknown> = {
      school_id: schoolId, saved_report_id: reportId,
      recipient_name: rec.name, recipient_email: rec.email,
    };
    if (rec.type === "user")     payload.recipient_user_id     = rec.id;
    if (rec.type === "guardian") payload.recipient_guardian_id = rec.id;
    const { error } = await supabase.from("report_shares").insert(payload);
    if (error) setShareError(error.message);
    else { setExisting(prev => [...prev, rec]); setSearch(""); setCandidates([]); }
    setSharing(null);
  }

  async function removeShare(rec: SystemRecipient) {
    setRemoving(rec.id);
    const col = rec.type === "user" ? "recipient_user_id" : "recipient_guardian_id";
    await supabase.from("report_shares").delete()
      .eq("saved_report_id", reportId).eq(col, rec.id);
    setExisting(prev => prev.filter(e => e.id !== rec.id));
    setRemoving(null);
  }

  const alreadyShared = (id: string) => existing.some(e => e.id === id);

  const avatarBg = (type: string) => type === "guardian" ? { bg: "#f0fdf4", fg: "#16a34a" } : { bg: "#eff6ff", fg: "#2563eb" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 50, backgroundColor: "white", borderRadius: 16, padding: "28px 24px", width: "min(480px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>Share Report</h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{reportName}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>

        <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 14, fontSize: 11, color: "#64748b" }}>
          Sharing is restricted to verified system contacts only. Free-text email entry is not permitted.
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          {loading && <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", border: "2px solid #e2e8f0", borderTopColor: "#3b82f6" }} />}
        </div>

        {candidates.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
            {candidates.map(rec => {
              const already = alreadyShared(rec.id);
              const col = avatarBg(rec.type);
              return (
                <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid #f8fafc", backgroundColor: already ? "#f8fafc" : "white" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: col.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: col.fg, flexShrink: 0 }}>
                    {rec.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.name}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{rec.email} · {rec.role}</p>
                  </div>
                  <button onClick={() => !already && share(rec)} disabled={already || sharing === rec.id}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 600, cursor: already ? "default" : "pointer", backgroundColor: already ? "#f1f5f9" : "#0f172a", color: already ? "#94a3b8" : "white", flexShrink: 0 }}>
                    {sharing === rec.id ? "..." : already ? "Shared" : "Share"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {search.length >= 2 && !loading && candidates.length === 0 && (
          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 14 }}>No system contacts found for "{search}"</p>
        )}

        {shareError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{shareError}</p>}

        <div style={{ flex: 1, overflowY: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Shared with ({existing.length})
          </p>
          {existing.length === 0 ? (
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Not shared with anyone yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {existing.map(rec => {
                const col = avatarBg(rec.type);
                return (
                  <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, backgroundColor: "#f8fafc" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: col.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: col.fg, flexShrink: 0 }}>
                      {rec.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>{rec.name}</p>
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{rec.email}</p>
                    </div>
                    <button onClick={() => removeShare(rec)} disabled={removing === rec.id}
                      style={{ fontSize: 11, color: "#ef4444", backgroundColor: "transparent", border: "none", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                      {removing === rec.id ? "..." : "Remove"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
