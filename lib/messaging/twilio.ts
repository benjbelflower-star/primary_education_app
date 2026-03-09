/**
 * Twilio Client Helper — SECONDARY / external-notification provider
 *
 * Used for:
 *   • SMS alerts to guardians / tutors who aren't actively in the app
 *   • WhatsApp messages (via Twilio WhatsApp sandbox or approved sender)
 *
 * Architecture: this file is the *browser-side* caller.
 * The actual Twilio Node SDK lives in /app/api/notify/sms/route.ts
 * so that credentials never touch the client bundle.
 *
 * To activate:
 *   1. Add to .env.local:
 *        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *        TWILIO_AUTH_TOKEN=your_auth_token
 *        TWILIO_PHONE_NUMBER=+1xxxxxxxxxx          (SMS sender)
 *        TWILIO_WHATSAPP_NUMBER=whatsapp:+1xxxxxxxxxx  (optional)
 *   2. npm install twilio  (only needed in the API route — already server-side)
 *   3. Uncomment the real Twilio calls in /app/api/notify/sms/route.ts
 */

export type SMSPayload = {
  /** E.164 format: +1xxxxxxxxxx */
  to: string;
  body: string;
};

export type WhatsAppPayload = {
  /** E.164 format — Twilio prepends "whatsapp:" automatically in the route */
  to: string;
  body: string;
};

export type TwilioResult = {
  success: boolean;
  sid?: string;       // Twilio message SID when live
  provider: "twilio" | "placeholder";
  error?: string;
};

// ─── Client helper ────────────────────────────────────────────────────────────

export const twilioClient = {
  /**
   * Send an SMS.  Calls the /api/notify/sms route handler.
   *
   * Usage:
   *   const result = await twilioClient.sendSMS({ to: "+16025551234", body: "Your invoice is overdue." });
   */
  async sendSMS(payload: SMSPayload): Promise<TwilioResult> {
    try {
      const res = await fetch("/api/notify/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "sms", ...payload }),
      });
      return res.ok ? await res.json() : { success: false, provider: "placeholder", error: "HTTP " + res.status };
    } catch (err) {
      return { success: false, provider: "placeholder", error: String(err) };
    }
  },

  /**
   * Send a WhatsApp message.
   *
   * Usage:
   *   const result = await twilioClient.sendWhatsApp({ to: "+16025551234", body: "Hi — your invoice is ready." });
   */
  async sendWhatsApp(payload: WhatsAppPayload): Promise<TwilioResult> {
    try {
      const res = await fetch("/api/notify/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp", ...payload }),
      });
      return res.ok ? await res.json() : { success: false, provider: "placeholder", error: "HTTP " + res.status };
    } catch (err) {
      return { success: false, provider: "placeholder", error: String(err) };
    }
  },
};
