import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUBJECTS_BUCKET, SIGNED_URL_TTL } from "@/lib/subjects";

function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Mint a short-lived signed URL for viewing a subject's PDF.
// Allowed for: the prof who owns it, or a student enrolled in a targeted group.
// The client caches the returned URL so repeat views hit the browser / SW cache.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: subject } = await admin
    .from("subjects")
    .select("teacher_id, file_path, title")
    .eq("id", id)
    .single();

  if (!subject) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let allowed = subject.teacher_id === user.id;

  if (!allowed) {
    const { data: canAccess } = await admin.rpc("can_access_subject", {
      uid: user.id,
      sid: id,
    });
    allowed = canAccess === true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: signed, error } = await admin.storage
    .from(SUBJECTS_BUCKET)
    .createSignedUrl(subject.file_path, SIGNED_URL_TTL);

  if (error || !signed) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, title: subject.title });
}
