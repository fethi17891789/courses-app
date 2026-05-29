import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, fullName, phone, role, activationKey } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 }
    );
  }

  if (role === "prof") {
    if (!activationKey || !activationKey.trim()) {
      return NextResponse.json(
        { error: "missing_key" },
        { status: 400 }
      );
    }

    const { data: keyRow, error: keyError } = await supabaseAdmin
      .from("activation_keys")
      .select("id, used_by")
      .eq("key", activationKey.trim())
      .single();

    if (keyError || !keyRow) {
      return NextResponse.json(
        { error: "invalid_key" },
        { status: 400 }
      );
    }

    if (keyRow.used_by) {
      return NextResponse.json(
        { error: "key_already_used" },
        { status: 400 }
      );
    }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: fullName?.trim() || "",
      phone: phone?.trim() || "",
      role,
    },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return NextResponse.json(
        { error: "email_taken" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "generic" },
      { status: 500 }
    );
  }

  if (role === "prof" && authData.user) {
    await supabaseAdmin
      .from("activation_keys")
      .update({
        used_by: authData.user.id,
        used_at: new Date().toISOString(),
      })
      .eq("key", activationKey.trim());
  }

  return NextResponse.json({ success: true });
}
