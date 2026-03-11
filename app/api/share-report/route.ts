import { NextRequest, NextResponse } from "next/server";

// To activate real email sending, install Resend and set RESEND_API_KEY:
//   npm install resend
//   Add RESEND_API_KEY=re_xxxx to your Vercel env vars
//
// Alternatively swap the provider block for SendGrid, Postmark, etc.

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL     = process.env.SHARE_FROM_EMAIL ?? "noreply@yourdomain.com";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
const IS_ENABLED     = Boolean(RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { recipientEmail, recipientName, reportName, sharedByName, sharedByEmail } =
    await request.json();

  if (!recipientEmail || !reportName) {
    return NextResponse.json({ error: "recipientEmail and reportName are required" }, { status: 400 });
  }

  const subject    = `${sharedByName ?? sharedByEmail ?? "A colleague"} shared a report with you`;
  const reportUrl  = `${APP_URL}/reports/builder`;
  const htmlBody   = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
      <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Report shared with you</h2>
      <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
        ${sharedByName ?? sharedByEmail ?? "A colleague"} has shared the following report with you:
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="font-weight: 600; font-size: 15px; margin: 0 0 4px;">${reportName}</p>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Open in the Report Builder to view and run this report.</p>
      </div>
      <a href="${reportUrl}" style="display: inline-block; background: #0f172a; color: white; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Open Report Builder
      </a>
      <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
        You received this because someone shared a report with your account. If you didn't expect this, you can ignore it.
      </p>
    </div>
  `;

  if (!IS_ENABLED) {
    // Placeholder — log intent and return success so the UI confirms the share
    console.log(`[share-report placeholder] Would email ${recipientEmail}:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Report:  ${reportName}`);
    console.log(`  From:    ${sharedByEmail}`);
    console.log(`  Set RESEND_API_KEY to enable real emails.`);
    return NextResponse.json({ success: true, provider: "placeholder" });
  }

  // ── Real Resend implementation ──────────────────────────────────────────────
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   recipientEmail,
        subject,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message ?? "Email send failed" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
