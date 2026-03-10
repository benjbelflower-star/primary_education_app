"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ScheduleJson = {
  days?: string[];        // e.g. ["M","W","F"] or ["Mon","Wed","Fri"]
  start_time?: string;   // "09:00"
  end_time?: string;     // "10:00"
};

type EnrolledSection = {
  id: string;
  name: string;
  room: string | null;
  schedule_json: ScheduleJson | null;
  course_name: string;
  course_code: string | null;
  teacher_name: string | null;
  term_name: string | null;
  term_start: string | null;
  term_end: string | null;
};

type StudentBasic = { first_name: string; last_name: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { key: "M",   label: "Mon" },
  { key: "T",   label: "Tue" },
  { key: "W",   label: "Wed" },
  { key: "Th",  label: "Thu" },
  { key: "F",   label: "Fri" },
];

const DAY_ALIASES: Record<string, string> = {
  Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F",
  Monday: "M", Tuesday: "T", Wednesday: "W", Thursday: "Th", Friday: "F",
};

function normalizeDay(d: string): string {
  return DAY_ALIASES[d] ?? d;
}

function to24Minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmt12(time: string): string {
  const mins = to24Minutes(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}${ampm}`;
}

const SLOT_START = 7 * 60;   // 7:00 AM
const SLOT_END   = 19 * 60;  // 7:00 PM
const SLOT_H     = 48;       // px per 60 min

const COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
  { bg: "#fef9c3", border: "#eab308", text: "#854d0e" },
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
  { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
  { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  { bg: "#cffafe", border: "#06b6d4", text: "#155e75" },
  { bg: "#f1f5f9", border: "#94a3b8", text: "#334155" },
];

function colorFor(index: number) {
  return COLORS[index % COLORS.length];
}

// ─── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ sections }: { sections: EnrolledSection[] }) {
  const totalMins = SLOT_END - SLOT_START;
  const totalPx   = (totalMins / 60) * SLOT_H;

  const hourLabels: { label: string; topPx: number }[] = [];
  for (let h = SLOT_START; h <= SLOT_END; h += 60) {
    hourLabels.push({ label: fmt12(`${Math.floor(h / 60)}:00`), topPx: ((h - SLOT_START) / 60) * SLOT_H });
  }

  const sectionsWithTime = sections.filter(s => s.schedule_json?.start_time && s.schedule_json?.end_time);
  const sectionsWithoutTime = sections.filter(s => !s.schedule_json?.start_time);

  return (
    <div>
      {/* All-day / no-time row */}
      {sectionsWithoutTime.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">No time set</p>
          <div className="flex flex-wrap gap-2">
            {sectionsWithoutTime.map((s, i) => {
              const c = colorFor(sections.indexOf(s));
              return (
                <span key={s.id} style={{ background: c.bg, borderColor: c.border, color: c.text }}
                  className="px-3 py-1 rounded-full text-xs font-semibold border">
                  {s.course_name} {s.room ? `· ${s.room}` : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div style={{ display: "grid", gridTemplateColumns: "52px repeat(5, 1fr)", minWidth: 480 }}>
          {/* Header row */}
          <div style={{ gridColumn: "1", borderBottom: "1px solid #e2e8f0" }} />
          {WEEKDAYS.map(d => (
            <div key={d.key} style={{ borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0" }}
              className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
              {d.label}
            </div>
          ))}

          {/* Time column + day columns */}
          <div style={{ gridColumn: "1", position: "relative", height: totalPx + "px", borderRight: "1px solid #f1f5f9" }}>
            {hourLabels.map(({ label, topPx }) => (
              <div key={label} style={{ position: "absolute", top: topPx - 7, left: 0, right: 0 }}
                className="text-right pr-2 text-xs text-gray-400 select-none">
                {label}
              </div>
            ))}
          </div>

          {WEEKDAYS.map(day => (
            <div key={day.key} style={{ position: "relative", height: totalPx + "px", borderLeft: "1px solid #f1f5f9" }}>
              {/* Hour grid lines */}
              {hourLabels.map(({ topPx }) => (
                <div key={topPx} style={{ position: "absolute", top: topPx, left: 0, right: 0, borderTop: "1px solid #f1f5f9" }} />
              ))}

              {/* Class blocks */}
              {sectionsWithTime.map((s, globalIdx) => {
                const days = (s.schedule_json!.days ?? []).map(normalizeDay);
                if (!days.includes(day.key)) return null;
                const startMins = to24Minutes(s.schedule_json!.start_time!);
                const endMins   = to24Minutes(s.schedule_json!.end_time!);
                if (startMins < SLOT_START || endMins > SLOT_END) return null;
                const top    = ((startMins - SLOT_START) / 60) * SLOT_H;
                const height = Math.max(((endMins - startMins) / 60) * SLOT_H - 2, 20);
                const c = colorFor(sections.indexOf(s));
                return (
                  <div key={s.id} style={{
                    position: "absolute", top, left: 2, right: 2, height,
                    background: c.bg, borderLeft: `3px solid ${c.border}`,
                    borderRadius: 6, overflow: "hidden", padding: "2px 4px",
                  }}>
                    <p style={{ color: c.text, fontSize: 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.course_name}
                    </p>
                    {height > 28 && s.room && (
                      <p style={{ color: c.text, fontSize: 10, opacity: 0.8 }}>{s.room}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Agenda View ───────────────────────────────────────────────────────────────

function AgendaView({ sections }: { sections: EnrolledSection[] }) {
  const byDay: Record<string, EnrolledSection[]> = { M: [], T: [], W: [], Th: [], F: [], Other: [] };

  for (const s of sections) {
    const days = (s.schedule_json?.days ?? []).map(normalizeDay);
    if (days.length === 0) {
      byDay["Other"].push(s);
    } else {
      for (const d of days) {
        if (byDay[d]) byDay[d].push(s);
        else byDay["Other"].push(s);
      }
    }
  }

  // Sort each day by start time
  for (const key of Object.keys(byDay)) {
    byDay[key].sort((a, b) => {
      const ta = a.schedule_json?.start_time ? to24Minutes(a.schedule_json.start_time) : 0;
      const tb = b.schedule_json?.start_time ? to24Minutes(b.schedule_json.start_time) : 0;
      return ta - tb;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {[...WEEKDAYS, { key: "Other", label: "No Day Set" }].map(({ key, label }) => {
        const items = byDay[key];
        if (!items || items.length === 0) return null;
        return (
          <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700">{label}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((s, i) => {
                const c = colorFor(sections.indexOf(s));
                const hasTime = s.schedule_json?.start_time && s.schedule_json?.end_time;
                return (
                  <div key={s.id + key} className="flex items-start gap-4 px-5 py-3">
                    <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: c.border, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{s.course_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {hasTime
                          ? `${fmt12(s.schedule_json!.start_time!)} – ${fmt12(s.schedule_json!.end_time!)}`
                          : "Time TBD"}
                        {s.room ? ` · Room ${s.room}` : ""}
                        {s.teacher_name ? ` · ${s.teacher_name}` : ""}
                      </p>
                    </div>
                    {s.term_name && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                        {s.term_name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StudentSchedulePage() {
  const { id } = useParams();
  const router = useRouter();

  const [student, setStudent] = useState<StudentBasic | null>(null);
  const [sections, setSections] = useState<EnrolledSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "agenda">("agenda");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data: studentData }, { data: rosterData }] = await Promise.all([
        supabase.from("students").select("first_name, last_name").eq("id", id).single(),
        supabase
          .from("section_rosters")
          .select(`
            sections (
              id, name, room, schedule_json,
              courses ( name, code ),
              terms ( name, start_date, end_date ),
              staff:primary_teacher_staff_id ( first_name, last_name )
            )
          `)
          .eq("student_id", id as string)
          .eq("status", "active"),
      ]);

      if (studentData) setStudent(studentData as StudentBasic);

      const parsed: EnrolledSection[] = (rosterData ?? [])
        .map((r: any) => r.sections)
        .filter(Boolean)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          room: s.room ?? null,
          schedule_json: s.schedule_json ?? null,
          course_name: s.courses?.name ?? s.name,
          course_code: s.courses?.code ?? null,
          teacher_name: s.staff
            ? `${s.staff.first_name} ${s.staff.last_name}`
            : null,
          term_name: s.terms?.name ?? null,
          term_start: s.terms?.start_date ?? null,
          term_end: s.terms?.end_date ?? null,
        }));

      setSections(parsed);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading schedule...</p>
    </div>
  );

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Student";

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-4xl mx-auto font-sans">

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/students/" + id)}
          className="text-blue-500 font-semibold text-sm mb-3 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
        >
          ← {studentName}
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
            <p className="text-sm text-gray-400 mt-0.5">{sections.length} class{sections.length !== 1 ? "es" : ""} enrolled</p>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden self-start">
            {(["agenda", "calendar"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-sm font-semibold capitalize cursor-pointer border-none transition-colors ${
                  view === v
                    ? "bg-slate-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {sections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-900 font-semibold">No classes scheduled</p>
          <p className="text-sm text-gray-400 mt-1">Enroll this student in sections to see their schedule here.</p>
        </div>
      ) : view === "calendar" ? (
        <CalendarView sections={sections} />
      ) : (
        <AgendaView sections={sections} />
      )}

      {/* Legend */}
      {sections.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((s, i) => {
            const c = colorFor(i);
            return (
              <span key={s.id} style={{ background: c.bg, borderColor: c.border, color: c.text }}
                className="px-3 py-1 rounded-full text-xs font-semibold border">
                {s.course_name}
                {s.course_code ? ` (${s.course_code})` : ""}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
