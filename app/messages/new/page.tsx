"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { sendbirdProvider } from "../../../lib/messaging";
import { Tutor, Student } from "../../../types";

type RecipientMode = "tutor" | "guardian" | "broadcast_tutors" | "broadcast_guardians";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<RecipientMode>("tutor");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [showWindow, setShowWindow] = useState(false);
  const [useWindow, setUseWindow] = useState(false);
  const [windowStart, setWindowStart] = useState("08:00");
  const [windowEnd, setWindowEnd] = useState("17:00");
  const [autoReply, setAutoReply] = useState(
    "Thanks for your message. I'll respond during business hours (Mon–Fri, 8am–5pm AZ time)."
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const isBroadcast = mode === "broadcast_tutors" || mode === "broadcast_guardians";

  useEffect(() => {
    async function load() {
      const [tutorRes, studentRes] = await Promise.all([
        supabase.from("tutors").select("id, full_name, email").eq("is_active", true).order("full_name"),
        supabase.from("students").select("id, first_name, last_name, guardian_name, guardian_email").eq("status", "active").order("last_name"),
      ]);
      if (tutorRes.data) setTutors(tutorRes.data as Tutor[]);
      if (studentRes.data) setStudents(studentRes.data as Student[]);
    }
    load();

    const tutorId = searchParams.get("tutorId");
    const studentId = searchParams.get("studentId");
    if (tutorId) { setMode("tutor"); setSelectedTutorId(tutorId); }
    if (studentId) { setMode("guardian"); setSelectedStudentId(studentId); }
  }, [searchParams]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!subject.trim() || !body.trim()) {
      setError("Subject and message body are required.");
      return;
    }
    if (mode === "tutor" && !selectedTutorId) {
      setError("Please select a tutor.");
      return;
    }
    if (mode === "guardian" && !selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    const senderName = user?.email?.split("@")[0] || "Staff";

    // Build participant list
    type Participant = { participant_type: string; participant_id: string; participant_name: string };
    let recipients: Participant[] = [];
    let threadType: "direct" | "broadcast" = "direct";

    if (mode === "tutor") {
      const t = tutors.find(t => t.id === selectedTutorId);
      if (t) recipients = [{ participant_type: "tutor", participant_id: t.id, participant_name: t.full_name }];
    } else if (mode === "guardian") {
      const s = students.find(s => s.id === selectedStudentId);
      if (s) {
        recipients = [{
          participant_type: "guardian",
          participant_id: s.id,
          participant_name: s.guardian_name || "Guardian",
        }];
      }
    } else if (mode === "broadcast_tutors") {
      threadType = "broadcast";
      recipients = tutors.map(t => ({ participant_type: "tutor", participant_id: t.id, participant_name: t.full_name }));
    } else if (mode === "broadcast_guardians") {
      threadType = "broadcast";
      recipients = students
        .filter(s => s.guardian_name)
        .map(s => ({ participant_type: "guardian", participant_id: s.id, participant_name: s.guardian_name! }));
    }

    // Build thread payload
    const threadPayload: Record<string, unknown> = {
      subject: subject.trim(),
      thread_type: threadType,
      category,
      created_by_type: "staff",
      created_by_id: user?.id ?? null,
      created_by_name: senderName,
    };

    // Broadcasts can never be replied to
    if (isBroadcast) {
      threadPayload.response_window_closes_at = new Date().toISOString();
    } else if (useWindow) {
      // Build today's date with the window end time
      const today = new Date().toISOString().split("T")[0];
      threadPayload.response_window_closes_at = `${today}T${windowEnd}:00`;
      threadPayload.auto_reply_message = autoReply;
    }

    const { data: thread, error: threadErr } = await supabase
      .from("message_threads")
      .insert(threadPayload)
      .select()
      .single();

    if (threadErr || !thread) {
      setError("Failed to create thread: " + (threadErr?.message ?? "Unknown error"));
      setSending(false);
      return;
    }

    // Insert participants (staff sender + all recipients)
    const allParticipants = [
      {
        thread_id: thread.id,
        participant_type: "staff",
        participant_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
        participant_name: senderName,
      },
      ...recipients.map(r => ({ thread_id: thread.id, ...r })),
    ];
    await supabase.from("thread_participants").insert(allParticipants);

    // Insert opening message
    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_type: "staff",
      sender_id: user?.id ?? null,
      sender_name: senderName,
      body: body.trim(),
    });

    // Create Sendbird channel for real-time messaging (no-op when placeholder)
    const channelUrl = await sendbirdProvider.createChannel({
      threadId: thread.id,
      name: subject.trim(),
      userIds: allParticipants.map(p => p.participant_id),
    });
    if (channelUrl && channelUrl !== "") {
      await supabase
        .from("message_threads")
        .update({ sendbird_channel_url: channelUrl })
        .eq("id", thread.id);
    }

    router.push("/messages/" + thread.id);
  }

  const recipientCounts = {
    tutors: tutors.length,
    guardians: students.filter(s => s.guardian_name).length,
  };

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto font-sans">
      <button
        onClick={() => router.push("/messages")}
        className="text-blue-500 font-semibold text-sm mb-5 bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors block"
      >
        ← Back to Inbox
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Message</h1>

      <form onSubmit={handleSend} className="flex flex-col gap-5">

        {/* Message type */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Message Type</div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "tutor" as const, label: "Direct → Tutor", icon: "🎓" },
              { value: "guardian" as const, label: "Direct → Guardian", icon: "👨‍👩‍👧" },
              { value: "broadcast_tutors" as const, label: "Broadcast → All Tutors", icon: "📢" },
              { value: "broadcast_guardians" as const, label: "Broadcast → All Families", icon: "📣" },
            ]).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={cx(
                  "px-3 py-2.5 rounded-lg border text-left text-sm font-medium transition-colors",
                  mode === opt.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Broadcast notice */}
        {isBroadcast && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
            This will be sent to{" "}
            <strong>
              {mode === "broadcast_tutors"
                ? `${recipientCounts.tutors} active tutor(s)`
                : `${recipientCounts.guardians} guardian(s)`}
            </strong>.
            {" "}Recipients cannot reply to broadcasts.
          </div>
        )}

        {/* Recipient selector — direct only */}
        {mode === "tutor" && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Recipient Tutor</label>
            <select
              value={selectedTutorId}
              onChange={e => setSelectedTutorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Select a tutor —</option>
              {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        )}

        {mode === "guardian" && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
              Student (guardian will receive)
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Select a student —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                  {s.guardian_name ? ` · ${s.guardian_name}` : " · (no guardian)"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="general">General</option>
            <option value="invoice">Invoice / Billing</option>
            <option value="attendance">Attendance</option>
            <option value="compliance">Compliance</option>
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Invoice follow-up for October sessions"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message here..."
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Response window — direct only */}
        {!isBroadcast && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <button
              type="button"
              onClick={() => setShowWindow(!showWindow)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 bg-transparent border-none cursor-pointer p-0 text-left"
            >
              <span>
                Response Window{" "}
                <span className="text-xs font-normal text-gray-400">(optional guardrail)</span>
              </span>
              <span className="text-gray-400 text-xs">{showWindow ? "▲" : "▼"}</span>
            </button>

            {showWindow && (
              <div className="mt-4 flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useWindow}
                    onChange={e => setUseWindow(e.target.checked)}
                    className="rounded"
                  />
                  Limit replies to specific hours
                </label>
                {useWindow && (
                  <>
                    <div className="flex gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                          type="time"
                          value={windowStart}
                          onChange={e => setWindowStart(e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Until</label>
                        <input
                          type="time"
                          value={windowEnd}
                          onChange={e => setWindowEnd(e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Auto-reply (outside hours)</label>
                      <textarea
                        value={autoReply}
                        onChange={e => setAutoReply(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/messages")}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className={cx(
              "flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors",
              sending ? "bg-gray-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-700 cursor-pointer"
            )}
          >
            {sending ? "Sending..." : isBroadcast ? "Send Broadcast" : "Send Message"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    }>
      <ComposeForm />
    </Suspense>
  );
}
