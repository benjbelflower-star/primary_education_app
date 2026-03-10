"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TermGrade = {
  id: string;
  numeric_grade: number | null;
  letter_grade: string | null;
  gpa_points: number | null;
  section_name: string;
  course_name: string;
  course_code: string | null;
  term_name: string;
  term_start: string | null;
  term_end: string | null;
};

type AssignmentScore = {
  id: string;
  points_earned: number | null;
  points_possible: number;
  status: string;
  title: string;
  due_date: string | null;
  course_name: string;
  section_id: string;
};

type StudentBasic = { first_name: string; last_name: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function letterColor(letter: string | null): { bg: string; text: string } {
  if (!letter) return { bg: "#f1f5f9", text: "#64748b" };
  const l = letter.toUpperCase();
  if (l.startsWith("A")) return { bg: "#dcfce7", text: "#15803d" };
  if (l.startsWith("B")) return { bg: "#dbeafe", text: "#1e40af" };
  if (l.startsWith("C")) return { bg: "#fef9c3", text: "#854d0e" };
  if (l.startsWith("D")) return { bg: "#ffedd5", text: "#9a3412" };
  return { bg: "#fee2e2", text: "#991b1b" };
}

function gradeBar(pct: number | null): string {
  if (pct === null) return "#e2e8f0";
  if (pct >= 90) return "#22c55e";
  if (pct >= 80) return "#3b82f6";
  if (pct >= 70) return "#eab308";
  if (pct >= 60) return "#f97316";
  return "#ef4444";
}

function calcGPA(grades: TermGrade[]): number | null {
  const pts = grades.filter(g => g.gpa_points !== null).map(g => g.gpa_points!);
  if (pts.length === 0) return null;
  return pts.reduce((a, b) => a + b, 0) / pts.length;
}

// ─── Spider / Radar Chart ──────────────────────────────────────────────────────

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 3) return null;

  const cx = 160;
  const cy = 160;
  const r  = 110;
  const n  = data.length;

  function angle(i: number) {
    return -Math.PI / 2 + (2 * Math.PI * i) / n;
  }

  function point(i: number, pct: number) {
    const a = angle(i);
    return { x: cx + r * pct * Math.cos(a), y: cy + r * pct * Math.sin(a) };
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axis spoke tips
  const tips = data.map((_, i) => point(i, 1.0));

  // Data polygon
  const dataPts = data.map((d, i) => point(i, Math.max(0, Math.min(1, d.value / 100))));
  const polyPoints = dataPts.map(p => `${p.x},${p.y}`).join(" ");

  // Label positions (slightly beyond tip)
  const labels = data.map((d, i) => {
    const a = angle(i);
    const dist = r + 22;
    return {
      x: cx + dist * Math.cos(a),
      y: cy + dist * Math.sin(a),
      label: d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label,
      value: d.value,
    };
  });

  return (
    <svg viewBox="0 0 320 320" style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
      {/* Ring grid */}
      {rings.map(frac => {
        const ringPts = data.map((_, i) => point(i, frac));
        return (
          <polygon
            key={frac}
            points={ringPts.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {/* Ring labels (25 / 50 / 75 / 100) */}
      {rings.map(frac => (
        <text key={"rl-" + frac} x={cx + 3} y={cy - r * frac + 4}
          fontSize={8} fill="#94a3b8" textAnchor="start">
          {frac * 100}
        </text>
      ))}

      {/* Axis spokes */}
      {tips.map((tip, i) => (
        <line key={i} x1={cx} y1={cy} x2={tip.x} y2={tip.y}
          stroke="#e2e8f0" strokeWidth={1} />
      ))}

      {/* Data fill */}
      <polygon
        points={polyPoints}
        fill="rgba(59,130,246,0.18)"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
      ))}

      {/* Labels */}
      {labels.map((l, i) => {
        const a = angle(i);
        const anchor = Math.cos(a) > 0.1 ? "start" : Math.cos(a) < -0.1 ? "end" : "middle";
        return (
          <g key={i}>
            <text x={l.x} y={l.y - 2} fontSize={9} fontWeight="700" fill="#374151" textAnchor={anchor}>
              {l.label}
            </text>
            <text x={l.x} y={l.y + 10} fontSize={8} fill="#6b7280" textAnchor={anchor}>
              {l.value.toFixed(0)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Assignment Detail ─────────────────────────────────────────────────────────

function AssignmentSection({ scores, sectionId }: { scores: AssignmentScore[]; sectionId: string }) {
  const items = scores.filter(s => s.section_id === sectionId);
  if (items.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Assignments</p>
      <div className="flex flex-col gap-1.5">
        {items.map(s => {
          const pct = s.points_earned !== null && s.points_possible > 0
            ? (s.points_earned / s.points_possible) * 100
            : null;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{s.title}</p>
                {s.due_date && <p className="text-xs text-gray-400">{s.due_date}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.status === "missing" ? (
                  <span className="text-xs font-semibold text-red-500">Missing</span>
                ) : s.status === "excused" ? (
                  <span className="text-xs font-semibold text-gray-400">Excused</span>
                ) : (
                  <span className="text-xs font-semibold text-gray-700">
                    {s.points_earned ?? "–"} / {s.points_possible}
                    {pct !== null && <span className="text-gray-400 ml-1">({pct.toFixed(0)}%)</span>}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StudentGradesPage() {
  const { id } = useParams();
  const router = useRouter();

  const [student, setStudent] = useState<StudentBasic | null>(null);
  const [grades, setGrades] = useState<TermGrade[]>([]);
  const [scores, setScores] = useState<AssignmentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data: studentData }, { data: gradeData }, { data: scoreData }] = await Promise.all([
        supabase.from("students").select("first_name, last_name").eq("id", id).single(),

        supabase
          .from("term_grades")
          .select(`
            id, numeric_grade, letter_grade, gpa_points,
            sections ( id, name, courses ( name, code ) ),
            terms ( name, start_date, end_date )
          `)
          .eq("student_id", id as string)
          .order("calculated_at", { ascending: false }),

        supabase
          .from("assignment_scores")
          .select(`
            id, points_earned, status,
            assignments ( id, title, due_date, points_possible, section_id,
              sections ( courses ( name ) )
            )
          `)
          .eq("student_id", id as string)
          .order("created_at", { ascending: false }),
      ]);

      if (studentData) setStudent(studentData as StudentBasic);

      setGrades((gradeData ?? []).map((g: any) => ({
        id: g.id,
        numeric_grade: g.numeric_grade,
        letter_grade: g.letter_grade,
        gpa_points: g.gpa_points,
        section_name: g.sections?.name ?? "—",
        section_id: g.sections?.id ?? "",
        course_name: g.sections?.courses?.name ?? g.sections?.name ?? "—",
        course_code: g.sections?.courses?.code ?? null,
        term_name: g.terms?.name ?? "—",
        term_start: g.terms?.start_date ?? null,
        term_end: g.terms?.end_date ?? null,
      })));

      setScores((scoreData ?? []).map((s: any) => ({
        id: s.id,
        points_earned: s.points_earned,
        points_possible: s.assignments?.points_possible ?? 0,
        status: s.status,
        title: s.assignments?.title ?? "—",
        due_date: s.assignments?.due_date ?? null,
        course_name: s.assignments?.sections?.courses?.name ?? "—",
        section_id: s.assignments?.section_id ?? "",
      })));

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Loading grades...</p>
    </div>
  );

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Student";

  const gpa = calcGPA(grades);

  // Group by term
  const termMap: Record<string, TermGrade[]> = {};
  for (const g of grades) {
    if (!termMap[g.term_name]) termMap[g.term_name] = [];
    termMap[g.term_name].push(g);
  }
  const terms = Object.keys(termMap);

  // Radar data: one axis per unique course, use latest numeric grade
  const courseGradeMap: Record<string, number> = {};
  for (const g of grades) {
    if (g.numeric_grade !== null && !(g.course_name in courseGradeMap)) {
      courseGradeMap[g.course_name] = g.numeric_grade;
    }
  }
  const radarData = Object.entries(courseGradeMap).map(([label, value]) => ({ label, value }));

  // Summary stats
  const best = grades.reduce<TermGrade | null>((acc, g) => {
    if (g.numeric_grade === null) return acc;
    return acc === null || g.numeric_grade > (acc.numeric_grade ?? 0) ? g : acc;
  }, null);

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto font-sans">

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/students/" + id)}
          className="text-blue-500 font-semibold text-sm mb-3 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
        >
          ← {studentName}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
      </div>

      {grades.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-gray-900 font-semibold">No grades recorded</p>
          <p className="text-sm text-gray-400 mt-1">Term grades will appear here once posted.</p>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              {
                label: "GPA",
                value: gpa !== null ? gpa.toFixed(2) : "—",
                sub: "cumulative",
                color: "#3b82f6",
              },
              {
                label: "Courses",
                value: String(Object.keys(courseGradeMap).length),
                sub: "with grades",
                color: "#8b5cf6",
              },
              {
                label: "Top Grade",
                value: best?.letter_grade ?? (best ? best.numeric_grade + "%" : "—"),
                sub: best?.course_name ? (best.course_name.length > 14 ? best.course_name.slice(0,13)+"…" : best.course_name) : "—",
                color: "#22c55e",
              },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center"
                style={{ borderTop: `3px solid ${s.color}` }}>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-300 mt-0.5 truncate">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Two-column layout: chart + term grades */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Radar chart card */}
            {radarData.length >= 3 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 lg:w-80 shrink-0 w-full">
                <h2 className="text-sm font-bold text-gray-700 mb-3">Performance by Subject</h2>
                <RadarChart data={radarData} />
              </div>
            )}

            {/* Term grades */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {terms.map(term => (
                <div key={term} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-bold text-gray-700">{term}</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {termMap[term].map(g => {
                      const pct = g.numeric_grade;
                      const lc = letterColor(g.letter_grade);
                      const barColor = gradeBar(pct);
                      const isOpen = expandedCourseId === g.id;

                      return (
                        <div key={g.id}>
                          <button
                            onClick={() => setExpandedCourseId(isOpen ? null : g.id)}
                            className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer bg-transparent border-none"
                          >
                            <div className="flex items-center gap-3">
                              {/* Letter grade badge */}
                              <div style={{ background: lc.bg, color: lc.text }}
                                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                                {g.letter_grade ?? "—"}
                              </div>

                              {/* Course name + bar */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 truncate">
                                  {g.course_name}
                                  {g.course_code && <span className="text-gray-400 font-normal ml-1">({g.course_code})</span>}
                                </p>
                                {/* Grade bar */}
                                <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div style={{ width: `${pct ?? 0}%`, background: barColor }}
                                    className="h-full rounded-full transition-all" />
                                </div>
                              </div>

                              {/* Percentage */}
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-gray-900">
                                  {pct !== null ? pct.toFixed(1) + "%" : "—"}
                                </p>
                                {g.gpa_points !== null && (
                                  <p className="text-xs text-gray-400">{g.gpa_points.toFixed(1)} pts</p>
                                )}
                              </div>

                              <span className="text-gray-300 text-sm ml-1 shrink-0">{isOpen ? "▾" : "›"}</span>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-4">
                              <AssignmentSection scores={scores} sectionId={(g as any).section_id} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
