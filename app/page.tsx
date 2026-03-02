"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

// Define a local interface to satisfy TypeScript
interface DashboardStats {
  activeStudents: number;
  unbilledLogs: number;
  draftPackets: number;
}

export default function CommandCenter() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    unbilledLogs: 0,
    draftPackets: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      // Fetching counts
      const { data: students } = await supabase.from("students").select("id").eq("school_id", PROTOTYPE_SCHOOL_ID).eq("status", "active");
      const { data: unbilled } = await supabase.from("service_logs").select("id").eq("school_id", PROTOTYPE_SCHOOL_ID).is("invoice_line_item_id", null);
      const { data: packets } = await supabase.from("claim_packets").select("id").eq("school_id", PROTOTYPE_SCHOOL_ID).eq("status", "Draft");

      // Fetching activity feed
      const { data: recent } = await supabase
        .from("service_logs")
        .select(`
          id, 
          service_date, 
          hours, 
          service_description,
          students (first_name, last_name)
        `)
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        activeStudents: students?.length || 0,
        unbilledLogs: unbilled?.length || 0,
        draftPackets: packets?.length || 0
      });

      if (recent) setRecentLogs(recent);
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  };

  const numberStyle: React.CSSProperties = { fontSize: "36px", fontWeight: 800, color: "#0f172a", margin: "10px 0" };
  const labelStyle: React.CSSProperties = { fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" };
  const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: 500, fontSize: "13px", padding: 0, textAlign: "left" };
  const buttonStyle: React.CSSProperties = { padding: "12px 16px", backgroundColor: "#334155", color: "white", borderRadius: "6px", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "14px", flex: 1 };

  if (loading) return <div style={{ padding: 40, fontFamily: "system-ui" }}>Loading Command Center...</div>;

  return (
    <div style={{ padding: "20px", maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px", color: "#0f172a" }}>Welcome Back</h1>
      <p style={{ color: "#64748b", marginBottom: "30px", fontSize: "14px" }}>School Overview</p>

      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "30px" }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Students</div>
          <div style={numberStyle}>{stats.activeStudents}</div>
          <button onClick={() => router.push("/students")} style={linkStyle}>Manage →</button>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Unbilled Logs</div>
          <div style={{ ...numberStyle, color: "#f97316" }}>{stats.unbilledLogs}</div>
          <button onClick={() => router.push("/invoices/new")} style={linkStyle}>Invoice →</button>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Draft Claims</div>
          <div style={numberStyle}>{stats.draftPackets}</div>
          <button onClick={() => router.push("/claims/new")} style={linkStyle}>Review →</button>
        </div>
      </div>

      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => router.push('/logs/new')} style={buttonStyle}>Log Hours</button>
          <button onClick={() => router.push('/tutors/new')} style={buttonStyle}>Add Tutor</button>
        </div>
      </div>

      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "16px", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>Recent Activity</h3>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>Date</th>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>Student</th>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>Description</th>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>Hrs</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 8px", fontSize: "13px", color: "#475569", whiteSpace: "nowrap" }}>{log.service_date}</td>
                  <td style={{ padding: "14px 8px", fontSize: "13px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>
                    {log.students?.first_name} {log.students?.last_name}
                  </td>
                  <td style={{ padding: "14px 8px", fontSize: "13px", color: "#475569", minWidth: "140px" }}>{log.service_description}</td>
                  <td style={{ padding: "14px 8px", fontSize: "13px", fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{log.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}