import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";

export async function DELETE(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // --- Director dissolves their school ---
  if (action === "dissolve_school") {
    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!org) {
      return NextResponse.json({ error: "not_director" }, { status: 403 });
    }

    // Deleting the organization cascades to:
    // - organization_members (teachers lose membership)
    // - groups, students, attendance, payments with org_id (all school data)
    // Teacher and student auth accounts are NOT affected.
    await admin.from("organizations").delete().eq("id", org.id);

    return NextResponse.json({ success: true });
  }

  // --- Director removes a teacher from school ---
  if (action === "remove_teacher") {
    const teacherId = url.searchParams.get("teacher_id");
    if (!teacherId) {
      return NextResponse.json({ error: "missing_teacher_id" }, { status: 400 });
    }

    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!org) {
      return NextResponse.json({ error: "not_director" }, { status: 403 });
    }

    // Reassign teacher's school data to the director so nothing is lost
    const tables = ["groups", "students", "attendance", "payments"] as const;
    for (const table of tables) {
      await admin
        .from(table)
        .update({ teacher_id: user.id })
        .eq("teacher_id", teacherId)
        .eq("org_id", org.id);
    }

    // Remove membership (frees a seat)
    await admin
      .from("organization_members")
      .delete()
      .eq("user_id", teacherId)
      .eq("org_id", org.id);

    return NextResponse.json({ success: true });
  }

  // --- School teacher deletes their own account ---
  const { data: membership } = await admin
    .from("organization_members")
    .select("id, org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membership) {
    // Find the director to reassign data
    const { data: org } = await admin
      .from("organizations")
      .select("owner_id")
      .eq("id", membership.org_id)
      .single();

    if (org) {
      const tables = ["groups", "students", "attendance", "payments"] as const;
      for (const table of tables) {
        await admin
          .from(table)
          .update({ teacher_id: org.owner_id })
          .eq("teacher_id", user.id)
          .eq("org_id", membership.org_id);
      }
    }

    await admin
      .from("organization_members")
      .delete()
      .eq("user_id", user.id);
  }

  // --- Director: dissolve school automatically before account deletion ---
  const { data: ownedOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownedOrg) {
    await admin.from("organizations").delete().eq("id", ownedOrg.id);
  }

  // --- Clean PII from feedback ---
  await admin
    .from("feedback")
    .update({ user_name: null, user_email: null })
    .eq("user_id", user.id);

  // --- Delete auth account (cascades personal data) ---
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
