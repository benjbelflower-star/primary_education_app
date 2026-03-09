"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { MessageThread, Message, ThreadParticipant } from "../../types";

type ThreadWithMeta = MessageThread & {
  latestMessage: Message | null;
  participants: ThreadParticipant[];
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function typeBadge(type: string) {
  if (type === "broadcast") return { label: "Broadcast", cls: "bg-purple-50 text-purple-700" };
  return { label: "Direct", cls: "bg-blue-50 text-blue-700" };
}

function categoryBadge(cat: string) {
  const map: Record<string, string> = {
    invoice: "bg-yellow-50 text-yellow-700",
    attendance: "bg-orange-50 text-orange-700",
    compliance: "bg-red-50 text-red-700",
  };
  return map[cat] ?? null;
}

export default function MessagesInbox() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "direct" | "broadcast">("all");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("message_threads")
        .select("*, thread_participants(*), messages(*)")
        .order("updated_at", { ascending: false });

      if (data) {
        const enriched: ThreadWithMeta[] = data.map((t: any) => {
          const msgs: Message[] = (t.messages || []).sort(
            (a: Message, b: Message) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          return {
            ...t,
            latestMessage: msgs[0] ?? null,
            participants: t.thread_participants || [],
          };
        });
        setThreads(enriched);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = threads.filter(t => filter === "all" || t.thread_type === filter);
  const counts = {
    all: threads.length,
    direct: threads.filter(t => t.thread_type === "direct").length,
    broadcast: threads.filter(t => t.thread_type === "broadcast").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Loading messages...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto font-sans">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={() => router.push("/messages/new")}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
        >
          + New Message
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
        {(["all", "direct", "broadcast"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              "flex-1 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {counts[f] > 0 && <span className="ml-1.5 text-xs text-gray-400">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm mb-3">No messages yet.</p>
          <button
            onClick={() => router.push("/messages/new")}
            className="text-blue-500 text-sm font-semibold hover:text-blue-700 cursor-pointer"
          >
            Send your first message →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(thread => {
            const type = typeBadge(thread.thread_type);
            const catCls = categoryBadge(thread.category);
            const recipientNames = thread.participants
              .filter(p => p.participant_name && p.participant_type !== "staff")
              .map(p => p.participant_name)
              .slice(0, 3)
              .join(", ");
            const extraCount = thread.participants.filter(
              p => p.participant_type !== "staff"
            ).length - 3;
            const lastTime = thread.latestMessage?.created_at || thread.created_at;

            return (
              <div
                key={thread.id}
                onClick={() => router.push("/messages/" + thread.id)}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={cx("px-2 py-0.5 rounded-full text-xs font-semibold", type.cls)}>
                        {type.label}
                      </span>
                      {catCls && (
                        <span className={cx("px-2 py-0.5 rounded-full text-xs font-semibold", catCls)}>
                          {thread.category}
                        </span>
                      )}
                      {thread.status === "closed" && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-gray-900 truncate">{thread.subject}</div>
                    {recipientNames && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        To: {recipientNames}
                        {extraCount > 0 && ` +${extraCount} more`}
                      </div>
                    )}
                    {thread.latestMessage && (
                      <div className="text-xs text-gray-400 mt-1 truncate">
                        <span className="font-medium text-gray-500">
                          {thread.latestMessage.sender_name}:
                        </span>{" "}
                        {thread.latestMessage.body}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-1">
                    {timeAgo(lastTime)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
