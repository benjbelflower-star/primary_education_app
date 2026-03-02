"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function CommandCenter() {
  const router = useRouter();
  const PROTOTYPE_SCHOOL_ID = "e03a9724-f97e-4967-992c-9fb278414016";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    unbilledLogs: 0,
    draftPackets: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      // 1. Fetch Active Students Count
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .eq("status", "active");

      // 2. Fetch Unbilled Service Logs Count
      const { data: unbilled } = await supabase
        .from("service_logs")
        .select("id")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .is("invoice_line_item_id", null);

      // 3. Fetch Draft Claim Packets Count
      const { data: packets } = await supabase
        .from("claim_packets")
        .select("id")
        .eq("school_id", PROTOTYPE_SCHOOL_ID)
        .eq("status", "Draft");

      // 4. Fetch the 5 most recent service logs for the activity feed
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
    padding: "30px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  };

  const numberStyle: React.CSSProperties = {
    fontSize: "48px",
    fontWeight: 800,
    color: "#0f172a",
    margin: "15px 0",
    fontFamily: "system-ui"
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };

  const linkStyle: React.CSSProperties = {
    background: "none", 
    border: "none", 
    color: "#3b82f6", 
    cursor: "pointer", 
    fontWeight: 400, 
    fontSize: "14px",
    padding: 0,
    textAlign: "left"
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px 24px",
    backgroundColor: "#334155",
    color: "white",
    borderRadius: "6px",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "15px"
  };

  if (loading) return <div style={{ padding: 60, fontFamily: "system-ui" }}>Loading Command Center...</div>;

  return (
    <div style={{ padding: "40px 60px", maxWidth: 1200, fontFamily: "system-ui" }}>
      
      {/* Header matching your existing UI */}
      <h1 style={{ fontSize: "36px", fontWeight: 400, marginBottom: "10px", color: "#0f172a" }}>Welcome Back</h1>
      <p style={{ color: "#64748b", marginBottom: "40px", fontSize: "16px" }}>School Overview: {PROTOTYPE_SCHOOL_ID}</p>

      {/* KPI Cards Row */}
      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "40px" }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Students</div>
          <div style={numberStyle}>{stats.activeStudents}</div>
          <button onClick={() => router.push("/students")} style={linkStyle}>Manage Students →</button>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Unbilled Service Logs</div>
          <div className="text-orange-500" style={{...numberStyle, color: "#f97316"}}>{stats.unbilledLogs}</div>          <button onClick={() => router.push("/invoices/new")} style={linkStyle}>Create Invoices →</button>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Draft Claim Packets</div>
          <div style={numberStyle}>{stats.draftPackets}</div>
          <button onClick={() => router.push("/claims/new")} style={linkStyle}>View Packets →</button>
        </div>
      </div>

      {/* Quick Actions matching your existing UI */}
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "40px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "16px", fontWeight: 500, color: "#0f172a" }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "16px" }}>
          <button onClick={() => router.push('/logs/new')} style={buttonStyle}>Log Daily Hours</button>
          <button onClick={() => router.push('/tutors')} style={buttonStyle}>Add New Tutor</button>
        </div>
      </div>

      {/* NEW: Recent Activity Feed */}
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ marginTop: 0, marginBottom: "20px", fontSize: "16px", fontWeight: 500, color: "#0f172a", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
          Recent Service Activity
        </h3>
        
        {recentLogs.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>No recent activity to display.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "12px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>Date</th>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "12px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>Student</th>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "12px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9" }}>Description</th>
                <th style={{ padding: "0 8px 12px 8px", color: "#64748b", fontSize: "12px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px 8px", fontSize: "14px", color: "#475569" }}>{log.service_date}</td>
                  <td style={{ padding: "16px 8px", fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {log.students?.first_name} {log.students?.last_name}
                  </td>
                  <td style={{ padding: "16px 8px", fontSize: "14px", color: "#475569" }}>{log.service_description}</td>
                  <td style={{ padding: "16px 8px", fontSize: "14px", fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{log.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}