import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Requires SUPABASE_SERVICE_ROLE_KEY in server env (never expose to client).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const IS_CONFIGURED = Boolean(SUPABASE_URL && SERVICE_KEY);

export async function POST(request: NextRequest) {
  const { email, first_name, last_name, school_id, role_name } =
    await request.json();

  if (!email || !school_id) {
    return NextResponse.json({ error: "email and school_id are required" }, { status: 400 });
  }

  if (!IS_CONFIGURED) {
    // Placeholder: log intent and return a fake success so the UI works during dev.
    console.log("[invite placeholder] Would invite:", { email, first_name, last_name, school_id, role_name });
    return NextResponse.json({
      success: true,
      provider: "placeholder",
      message: "SUPABASE_SERVICE_ROLE_KEY not set — invite not actually sent.",
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Invite user via Supabase Auth (sends a magic-link email).
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name },
  });

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 400 });
  }

  const userId = invited.user.id;

  // 2. Upsert the public users record (handles re-invites gracefully).
  const { error: upsertErr } = await admin
    .from("users")
    .upsert({ id: userId, email, first_name: first_name || null, last_name: last_name || null, school_id }, { onConflict: "id" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // 3. Assign role if provided.
  if (role_name) {
    const { data: roleRow } = await admin
      .from("roles")
      .select("id")
      .eq("school_id", school_id)
      .eq("name", role_name)
      .single();

    if (roleRow) {
      await admin
        .from("user_roles")
        .upsert({ user_id: userId, role_id: roleRow.id }, { onConflict: "user_id" });
    }
  }

  return NextResponse.json({ success: true, userId });
}
