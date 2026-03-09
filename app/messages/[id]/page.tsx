"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { sendbirdProvider, twilioClient } from "../../../lib/messaging";
import { MessageThread, Message, ThreadParticipant } from "../../../types";

const TRANSLATE_LANGS = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
];

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isReplyWindowClosed(thread: MessageThread): boolean {
  if (!thread.response_window_closes_at) return false;
  return new Date() > new Date(thread.response_window_closes_at);
}

export default function ThreadDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ThreadParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);
  // Map of messageId → translated body (local state only — translation scaffold)
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translateTarget, setTranslateTarget] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [threadRes, msgRes, partRes] = await Promise.all([
        supabase.from("message_threads").select("*").eq("id", id).single(),
        supabase.from("messages").select("*").eq("thread_id", id).order("created_at", { ascending: true }),
        supabase.from("thread_participants").select("*").eq("thread_id", id),
      ]);

      if (threadRes.data) setThread(threadRes.data as MessageThread);
      if (msgRes.data) {
        setMessages(msgRes.data as Message[]);
        // Mark all messages as read for current user
        if (user && msgRes.data.length > 0) {
          const receipts = msgRes.data.map((m: Message) => ({
            message_id: m.id,
            reader_type: "staff",
            reader_id: user.id,
          }));
          // upsert ignores conflicts (already read)
          await supabase.from("message_receipts").upsert(receipts, { ignoreDuplicates: true });
        }
      }
      if (partRes.data) setParticipants(partRes.data as ThreadParticipant[]);

      // Subscribe to Sendbird for real-time delivery (no-op in placeholder mode)
      if (threadRes.data?.sendbird_channel_url) {
        await sendbirdProvider.markAsRead(threadRes.data.sendbird_channel_url);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  // Sendbird real-time subscription (activates when NEXT_PUBLIC_SENDBIRD_APP_ID is set)
  useEffect(() => {
    if (!thread?.sendbird_channel_url) return;
    const unsubscribe = sendbirdProvider.subscribe(
      thread.sendbird_channel_url,
      (sbMsg) => {
        // Convert Sendbird message to our Message shape and append
        setMessages(prev => {
          // Deduplicate by sender+timestamp in case Supabase already has it
          const alreadyExists = prev.some(
            m => m.sender_id === sbMsg.senderId && new Date(m.created_at).getTime() === sbMsg.createdAt
          );
          if (alreadyExists) return prev;
          return [
            ...prev,
            {
              id: String(sbMsg.messageId),
              school_id: null,
              thread_id: thread.id,
              sender_type: "staff" as const,
              sender_id: sbMsg.senderId,
              sender_name: sbMsg.senderName,
              body: sbMsg.message,
              original_language: "en",
              is_auto_reply: false,
              created_at: new Date(sbMsg.createdAt).toISOString(),
            },
          ];
        });
      }
    );
    return unsubscribe;
  }, [thread?.sendbird_channel_url]);

  // Scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || !thread || !currentUserId) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    const senderName = user?.email?.split("@")[0] || "Staff";

    const { data: newMsg, error } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        sender_type: "staff",
        sender_id: currentUserId,
        sender_name: senderName,
        body: replyBody.trim(),
      })
      .select()
      .single();

    if (!error && newMsg) {
      setMessages(prev => [...prev, newMsg as Message]);
      // Update thread updated_at
      await supabase
        .from("message_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id);
    }

    setReplyBody("");
    setSending(false);
  }

  async function handleCloseThread() {
    if (!thread) return;
    setClosing(true);

    const { data: { user } } = await supabase.auth.getUser();
    const senderName = user?.email?.split("@")[0] || "Staff";

    // Insert a system close message
    const { data: closeMsg } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        sender_type: "system",
        sender_id: null,
        sender_name: senderName,
        body: "This thread has been closed.",
        is_auto_reply: true,
      })
      .select()
      .single();

    await supabase
      .from("message_threads")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", thread.id);

    setThread(prev => prev ? { ...prev, status: "closed" } : prev);
    if (closeMsg) setMessages(prev => [...prev, closeMsg as Message]);
    setClosing(false);
  }

  async function handleReopenThread() {
    if (!thread) return;
    await supabase
      .from("message_threads")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", thread.id);
    setThread(prev => prev ? { ...prev, status: "open" } : prev);
  }

  async function handleSendSMS(e: React.FormEvent) {
    e.preventDefault();
    if (!smsPhone.trim() || !thread) return;
    setSmsSending(true);
    setSmsResult(null);
    const latestMsg = messages[messages.length - 1];
    const latestBody = latestMsg ? latestMsg.body.slice(0, 140) : "";
    const smsBody = latestMsg ? thread.subject + ": " + latestBody : thread.subject;
    const result = await twilioClient.sendSMS({ to: smsPhone.trim(), body: smsBody });
    if (result.success) {
      setSmsResult(result.provider === "placeholder"
        ? "SMS queued (Twilio not yet connected — see /api/notify/sms/route.ts)."
        : "SMS sent. SID: " + result.sid);
    } else {
      setSmsResult("Failed: " + result.error);
    }
    setSmsSending(false);
  }

  // Translation scaffold — swap in a real API call here when ready
  function handleTranslate(msgId: string, body: string, lang: string) {
    // TODO: call DeepL / Google Translate API here
    // For now, show a placeholder to demonstrate the pattern
    setTranslations(prev => ({
      ...prev,
      [msgId]: `[${lang.toUpperCase()} translation of "${body.slice(0, 30)}..." — connect a translation API to enable]`,
    }));
    setTranslateTarget(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Loading thread...</p>
    </div>
  );

  if (!thread) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Thread not found.</p>
    </div>
  );

  const replyClosed = thread.status === "closed" || isReplyWindowClosed(thread);
  const isBroadcast = thread.thread_type === "broadcast";
  const recipientParticipants = participants.filter(p => p.participant_type !== "staff");

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto font-sans flex flex-col gap-4">

      {/* Back */}
      <button
        onClick={() => router.push("/messages")}
        className="text-blue-500 font-semibold text-sm bg-transparent border-none cursor-pointer p-0 hover:text-blue-700 transition-colors self-start"
      >
        ← Back to Inbox
      </button>

      {/* Thread header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={cx(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                isBroadcast ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
              )}>
                {isBroadcast ? "Broadcast" : "Direct"}
              </span>
              {thread.category !== "general" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 capitalize">
                  {thread.category}
                </span>
              )}
              <span className={cx(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                thread.status === "open" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              )}>
                {thread.status}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{thread.subject}</h1>
            {thread.created_by_name && (
              <p className="text-xs text-gray-400 mt-1">
                Started by {thread.created_by_name} · {formatTime(thread.created_at)}
              </p>
            )}
            {recipientParticipants.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                To:{" "}
                {recipientParticipants
                  .map(p => p.participant_name || p.participant_type)
                  .slice(0, 5)
                  .join(", ")}
                {recipientParticipants.length > 5 && ` +${recipientParticipants.length - 5} more`}
              </p>
            )}
            {thread.related_entity_type && thread.related_entity_id && (
              <button
                onClick={() => router.push(`/${thread.related_entity_type}s/${thread.related_entity_id}`)}
                className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-semibold bg-transparent border-none cursor-pointer p-0"
              >
                View linked {thread.related_entity_type} →
              </button>
            )}
          </div>

          {/* Close / reopen */}
          {thread.status === "open" ? (
            <button
              onClick={handleCloseThread}
              disabled={closing}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
            >
              {closing ? "Closing..." : "Close Thread"}
            </button>
          ) : (
            <button
              onClick={handleReopenThread}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
            >
              Reopen Thread
            </button>
          )}
        </div>
      </div>

      {/* Message timeline */}
      <div className="flex flex-col gap-3">
        {messages.map(msg => {
          const isStaff = msg.sender_type === "staff";
          const isSystem = msg.sender_type === "system";
          const translated = translations[msg.id];

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {msg.body}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cx(
                "flex flex-col gap-1 max-w-[85%]",
                isStaff ? "self-end items-end" : "self-start items-start"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs text-gray-400 px-1">
                <span className="font-medium text-gray-600">{msg.sender_name}</span>
                <span>·</span>
                <span>{formatTime(msg.created_at)}</span>
                {msg.original_language !== "en" && (
                  <span className="text-teal-500 uppercase font-semibold">{msg.original_language}</span>
                )}
              </div>

              <div className={cx(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                isStaff
                  ? "bg-slate-900 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
              )}>
                {msg.body}
              </div>

              {/* Translated version */}
              {translated && (
                <div className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-100 text-xs text-teal-800 max-w-full">
                  {translated}
                </div>
              )}

              {/* Translate button scaffold */}
              <div className="relative px-1">
                {translateTarget === msg.id ? (
                  <div className="flex gap-1 flex-wrap">
                    {TRANSLATE_LANGS.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleTranslate(msg.id, msg.body, lang.code)}
                        className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        {lang.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setTranslateTarget(null)}
                      className="text-xs px-2 py-0.5 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setTranslateTarget(msg.id)}
                    className="text-xs text-gray-300 hover:text-gray-500 transition-colors cursor-pointer bg-transparent border-none p-0"
                  >
                    Translate
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box or closed notice */}
      {replyClosed ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          {thread.status === "closed" ? (
            <p className="text-sm text-gray-400">This thread is closed. Reopen it to send a reply.</p>
          ) : isBroadcast ? (
            <p className="text-sm text-gray-400">Broadcasts are one-way — recipients cannot reply.</p>
          ) : (
            <div>
              <p className="text-sm text-gray-400 mb-1">Reply window has closed.</p>
              {thread.auto_reply_message && (
                <p className="text-xs text-gray-400 italic">&ldquo;{thread.auto_reply_message}&rdquo;</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleReply} className="bg-white rounded-xl border border-gray-200 p-4">
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !replyBody.trim()}
              className={cx(
                "px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors",
                sending || !replyBody.trim()
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-700 cursor-pointer"
              )}
            >
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      )}
      {/* SMS via Twilio — send the latest message as a text to any phone */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-5 py-3 text-sm font-semibold text-gray-700 cursor-pointer select-none list-none flex items-center justify-between">
          <span>📱 Send as SMS (Twilio)</span>
          <span className="text-xs font-normal text-gray-400">secondary channel</span>
        </summary>
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400 mb-3">
            Sends the latest message in this thread as an SMS to any mobile number.
            Useful for reaching guardians or tutors who are not in the app.
          </p>
          <form onSubmit={handleSendSMS} className="flex gap-2 items-start flex-wrap">
            <input
              type="tel"
              value={smsPhone}
              onChange={e => setSmsPhone(e.target.value)}
              placeholder="+1 (602) 555-0100"
              className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={smsSending || !smsPhone.trim()}
              className={
                "px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors " +
                (smsSending || !smsPhone.trim()
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-700 cursor-pointer")
              }
            >
              {smsSending ? "Sending..." : "Send SMS"}
            </button>
          </form>
          {smsResult && (
            <p className={"mt-2 text-xs rounded-lg px-3 py-2 " +
              (smsResult.startsWith("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
              {smsResult}
            </p>
          )}
        </div>
      </details>

    </div>
  );
}
