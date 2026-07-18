import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";
import { validateString, validatePhone, validateEnrolledSessions, firstError } from "@/lib/validate";


function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const level = searchParams.get("level")?.trim();

  // Portee : un prof voit les eleves qu'il possede ET ceux inscrits dans l'un de
  // SES groupes (meme si le dossier eleve appartient a un autre prof de l'ecole).
  // Un directeur : tous les profs de l'ecole. On calcule aussi, par eleve, la
  // liste des profs associes (teacher_ids) pour le filtre "par prof".
  const scope = await getSchoolScope(user.id);
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];
  const admin = getSupabaseAdmin();

  // Groupes de la portee + leur proprietaire.
  const { data: scopeGroups } = await admin
    .from("groups")
    .select("id, teacher_id")
    .in("teacher_id", teacherIds);
  const groupOwner = new Map((scopeGroups || []).map((g) => [g.id, g.teacher_id]));
  const groupIds = (scopeGroups || []).map((g) => g.id);

  // Inscriptions dans ces groupes -> par eleve, l'ensemble des profs concernes.
  const memberProfIds = new Map<string, Set<string>>();
  if (groupIds.length > 0) {
    const { data: memberships } = await admin
      .from("group_members")
      .select("student_id, group_id")
      .in("group_id", groupIds);
    for (const m of memberships || []) {
      const owner = groupOwner.get(m.group_id);
      if (!owner) continue;
      if (!memberProfIds.has(m.student_id)) memberProfIds.set(m.student_id, new Set());
      memberProfIds.get(m.student_id)!.add(owner);
    }
  }
  const memberStudentIds = [...memberProfIds.keys()];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = (q: any) => {
    if (search && search.length <= 100) q = q.ilike("full_name", `%${search}%`);
    if (level) q = q.eq("level", level);
    return q;
  };

  // Eleves possedes par la portee + eleves inscrits dans les groupes de la portee.
  const ownedReq = applyFilters(
    admin.from("students").select("*, group_members(count)").in("teacher_id", teacherIds),
  );
  const sharedReq = memberStudentIds.length
    ? applyFilters(admin.from("students").select("*, group_members(count)").in("id", memberStudentIds))
    : Promise.resolve({ data: [] as unknown[] });

  const [ownedRes, sharedRes] = await Promise.all([ownedReq, sharedReq]);
  if ((ownedRes as { error?: unknown }).error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Fusion + dedoublonnage par id.
  const byId = new Map<string, Record<string, unknown>>();
  for (const s of [...(ownedRes.data || []), ...((sharedRes as { data?: unknown[] }).data || [])]) {
    const st = s as Record<string, unknown>;
    byId.set(st.id as string, st);
  }

  const formatted = [...byId.values()]
    .map((s) => {
      const ownerId = s.teacher_id as string;
      const profs = new Set(memberProfIds.get(s.id as string) ?? []);
      profs.add(ownerId); // le proprietaire du dossier compte aussi
      return {
        ...s,
        teacher_ids: [...profs],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        group_count: (s.group_members as any)?.[0]?.count ?? 0,
        group_members: undefined,
      };
    })
    .sort((a, b) =>
      String((b as Record<string, unknown>).created_at).localeCompare(
        String((a as Record<string, unknown>).created_at),
      ),
    );

  return NextResponse.json(formatted);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { full_name, phone, parent_phone, level, section, notes, group_id, groups: groupAssignments } = body;

  const validationError = firstError(
    validateString(full_name, "full_name", { max: 100 }),
    validateString(level, "level", { max: 50 }),
    validatePhone(phone),
    validatePhone(parent_phone),
  );
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const plan = user.user_metadata?.plan || "starter";
  if (plan === "starter") {
    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id);

    if ((count ?? 0) >= 45) {
      return NextResponse.json({ error: "student_limit_reached" }, { status: 403 });
    }
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      teacher_id: user.id,
      full_name: full_name.trim().slice(0, 100),
      phone: phone?.trim().slice(0, 20) || null,
      parent_phone: parent_phone?.trim().slice(0, 20) || null,
      level: level.trim().slice(0, 50),
      section: section?.trim().slice(0, 50) || null,
      notes: notes?.trim().slice(0, 500) || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (Array.isArray(groupAssignments) && groupAssignments.length > 0) {
    for (const ga of groupAssignments) {
      if (!ga.group_id) continue;
      await supabase.from("group_members").insert({
        group_id: ga.group_id,
        student_id: student.id,
        enrolled_sessions: Array.isArray(ga.enrolled_sessions) && ga.enrolled_sessions.length > 0
          ? ga.enrolled_sessions
          : null,
      });
    }
  } else if (group_id) {
    await supabase.from("group_members").insert({
      group_id,
      student_id: student.id,
    });
  }

  return NextResponse.json(student);
}
