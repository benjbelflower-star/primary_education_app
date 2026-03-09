/**
 * POST /api/notify/sms
 *
 * Handles SMS and WhatsApp delivery via Twilio.
 * Runs server-side only — credentials never reach the browser bundle.
 *
 * To activate:
 *   1. npm install twilio
 *   2. Add to .env.local:
 *        TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *        TWILIO_AUTH_TOKEN=your_auth_token
 *        TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
 *        TWILIO_WHATSAPP_NUMBER=whatsapp:+1xxxxxxxxxx  (optional)
 *   3. Uncomment the twilio block below and remove the placeholder block.
 *
 * Request body:
 *   { channel: "sms" | "whatsapp", to: string (E.164), body: string }
 *
 * Response:
 *   { success: boolean, sid?: string, provider: "twilio" | "placeholder" }
 */

import { NextRequest, NextResponse } from "next/server";

const IS_ENABLED =
  Boolean(process.env.TWILIO_ACCOUNT_SID) &&
  Boolean(process.env.TWILIO_AUTH_TOKEN) &&
  Boolean(process.env.TWILIO_PHONE_NUMBER);

export async function POST(request: NextRequest) {
  let body: { channel?: string; to?: string; body?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { channel = "sms", to, body: text } = body;

  if (!to || !text) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: to, body" },
      { status: 400 }
    );
  }

  // ── Placeholder mode ──────────────────────────────────────────────────────
  if (!IS_ENABLED) {
    console.log(`[Twilio placeholder] ${channel.toUpperCase()} to ${to}:`, text);
    return NextResponse.json({
      success: true,
      provider: "placeholder",
      sid: `placeholder-${Date.now()}`,
    });
  }

  // ── Real Twilio implementation ────────────────────────────────────────────
  // Uncomment when npm install twilio is done and env vars are set:
  //
  // import twilio from "twilio";
  //
  // const client = twilio(
  //   process.env.TWILIO_ACCOUNT_SID!,
  //   process.env.TWILIO_AUTH_TOKEN!
  // );
  //
  // let from: string;
  // if (channel === "whatsapp") {
  //   from = process.env.TWILIO_WHATSAPP_NUMBER ?? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  //   const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  //   const msg = await client.messages.create({ from, to: toFormatted, body: text });
  //   return NextResponse.json({ success: true, sid: msg.sid, provider: "twilio" });
  // } else {
  //   from = process.env.TWILIO_PHONE_NUMBER!;
  //   const msg = await client.messages.create({ from, to, body: text });
  //   return NextResponse.json({ success: true, sid: msg.sid, provider: "twilio" });
  // }
  // ──────────────────────────────────────────────────────────────────────────

  // Fallback (should not reach here when IS_ENABLED is true and block is uncommented)
  return NextResponse.json({ success: false, error: "Twilio not fully configured" }, { status: 500 });
}
