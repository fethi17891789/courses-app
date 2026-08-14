import { getSchoolTeachers } from "@/lib/school-scope";
import { getAuthUser } from "@/lib/auth-user";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Liste des profs de l'ecole du directeur connecte (lui inclus). Sert au filtre
// "par prof" et au mapping teacher_id -> nom des badges cote client.
// - Non-directeur : { is_director: false, teachers: [] } (aucune vue ecole).
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const scope = await getSchoolTeachers(user.id);

  return NextResponse.json({
    is_director: scope.isDirector,
    teachers: scope.teachers,
  });
}
