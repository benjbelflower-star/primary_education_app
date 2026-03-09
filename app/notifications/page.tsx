"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { AppNotification } from "../../types";
import { twilioClient } from "../../lib/messaging";

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

const TYPE_META: Record<string, { icon: string; cls: string }> = {
  invoice_overdue:   { icon: "💰", cls: "bg-yellow-50 border-yellow-200" },
  attendance_absent: { icon: "📋", cls: "bg-orange-50 border-orange-200" },
  message_received:  { icon: "💬", cls: "bg-blue-50 border-blue-200" },
  grade_alert:       { icon: "📊", cls: "bg-red-50 border-red-200" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: "🔔", cls: "bg-gray-50 border-gray-200" };
}

// Generates overdue-invoice notifications for any invoice that has been
// outstanding for 30+ days and has no notification created in the last 7 days.
async function checkForOverdueInvoices(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: overdue } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, student_display_name, tutor_name")
    .not("status", "eq", "paid")
    .lte("issue_date", cutoff);

  if (!overdue || overdue.length === 0) return 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCutoff = sevenDaysAgo.toISOString();

  let created = 0;
  for (const inv of overdue) {
    // Check if we already have a recent notification for this invoice
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("notification_type", "invoice_overdue")
      .eq("related_entity_id", inv.id)
      .gte("created_at", recentCutoff)
      .maybeSingle();

    if (!existing) {
      const studentLabel = inv.student_display_name ? ` for ${inv.student_display_name}` : "";
      const totalLabel = inv.total ? ` · $${Number(inv.total).toFixed(2)}` : "";
      await supabase.from("notifications").insert({
        recipient_type: "staff",
        notification_type: "invoice_overdue",
        title: `Invoice ${inv.invoice_number} is overdue`,
        body: `Invoice ${inv.invoice_number}${studentLabel}${totalLabel} has been outstanding for over 30 days.`,
        related_entity_type: "invoice",
        related_entity_id: inv.id,
        related_entity_label: inv.invoice_number,
        action_url: `/invoices/${inv.id}`,
      });
      created++;
    }
  }
  return created;
}

// Inline SMS send widget — collapses to a link, expands to a phone input
function SMSInline({
  notification,
  onSend,
}: {
  notification: AppNotification;
  onSend: (n: AppNotification, phone: string) => Promise<{ success: boolean; provider: string; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSending(true);
    const result = await onSend(notification, phone.trim());
    setStatus(result.success
      ? (result.provider === "placeholder" ? "Queued (Twilio placeholder)" : "Sent!")
      : ("Error: " + result.error));
    setSending(false);
  }

  if (status) return <span className="text-xs text-green-600 font-medium">{status}</span>;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0"
      >
        📱 SMS
      </button>
    );
  }

  return (
    <form onSubmit={send} className="flex gap-1 items-center">
      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="+1 (602) 555-0100"
        autoFocus
        className="px-2 py-0.5 rounded border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
      />
      <button
        type="submit"
        disabled={sending}
        className="text-xs text-blue-600 font-semibold bg-transparent border-none cursor-pointer p-0 disabled:text-gray-400"
      >
        {sending ? "..." : "Send"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-gray-400 bg-transparent border-none cursor-pointer p-0"
      >
        ✕
      </button>
    </form>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) setNotifications(data as AppNotification[]);
  }

  useEffect(() => {
    async function init() {
      setScanning(true);
      try {
        const newCount = await checkForOverdueInvoices();
        if (newCount > 0) setScanResult(`${newCount} new overdue invoice alert(s) generated.`);
      } catch {
        // Scanning is best-effort; don't block the page
      }
      await loadNotifications();
      setScanning(false);
      setLoading(false);
    }
    init();
  }, []);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleSMSNotification(notification: AppNotification, phone: string) {
    const result = await twilioClient.sendSMS({ to: phone, body: notification.title + " — " + notification.body });
    if (result.success && result.provider !== "placeholder") {
      // Record the SMS sid back to the notification row
      await supabase
        .from("notifications")
        .update({ twilio_sms_sid: result.sid, sms_sent_at: new Date().toISOString(), sms_recipient: phone })
        .eq("id", notification.id);
    }
    return result;
  }

  async function manualScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const newCount = await checkForOverdueInvoices();
      setScanResult(newCount > 0 ? `${newCount} new alert(s) generated.` : "No new alerts found.");
      await loadNotifications();
    } catch {
      setScanResult("Scan failed — check console.");
    }
    setScanning(false);
  }

  const displayed = filter === "unread"
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Loading notifications...</p>
    </div>
  );

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto font-sans">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={manualScan}
            disabled={scanning}
            className={cx(
              "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
              scanning
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer"
            )}
          >
            {scanning ? "Scanning..." : "Scan Now"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Scan result toast */}
      {scanResult && (
        <div className="mb-4 p-3 rounded-lg bg-teal-50 border border-teal-100 text-sm text-teal-700">
          {scanResult}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg mt-4">
        {(["unread", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              "flex-1 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            {f === "unread" ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` : "All"}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">
            {filter === "unread" ? "You're all caught up." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayed.map(n => {
            const meta = getTypeMeta(n.notification_type);
            return (
              <div
                key={n.id}
                className={cx(
                  "rounded-xl border px-5 py-4 transition-colors",
                  meta.cls,
                  !n.is_read && "shadow-sm",
                  n.is_read && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-start flex-1 min-w-0">
                    <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{n.title}</span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.body}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                        {n.action_url && (
                          <button
                            onClick={() => router.push(n.action_url!)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-semibold bg-transparent border-none cursor-pointer p-0"
                          >
                            View →
                          </button>
                        )}
                        <SMSInline notification={n} onSend={handleSMSNotification} />
                      </div>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="shrink-0 text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0 whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
