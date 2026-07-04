import { NextResponse } from "next/server";
import { requireOwner, getSupabaseAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("feedback")
    .select("id, user_id, user_name, user_email, type, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}
