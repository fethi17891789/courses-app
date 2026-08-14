import { getAuthUser } from "@/lib/auth-user";
import {
  fetchGroups,
  fetchStudents,
  fetchTodaySessions,
  fetchPaymentsOverview,
  QueryError,
} from "@/lib/dashboard-queries";
import { NextResponse } from "next/server";

/**
 * Route unifiee du tableau de bord.
 *
 * PERF : l'ecran d'accueil appelait /api/groups, /api/students,
 * /api/attendance/today et /api/payments/overview en parallele. Quatre requetes
 * HTTP = quatre verifications d'identite et quatre appels a getSchoolScope.
 * Ici tout se passe dans UNE requete : l'identite est verifiee une fois, et le
 * `cache()` de React ramene getSchoolScope a une seule lecture pour les quatre
 * fonctions. Les requetes de donnees, elles, restent en parallele.
 *
 * Les compteurs sont calcules cote serveur : le tableau de bord n'affichait que
 * ces quatre nombres, mais telechargeait au prealable la totalite des eleves,
 * des seances et des dettes pour en prendre la longueur. Les formules sont
 * reprises telles quelles depuis dashboard-content.tsx.
 */
export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [groups, students, sessions, payments] = await Promise.all([
      fetchGroups(user),
      fetchStudents(user),
      fetchTodaySessions(user),
      fetchPaymentsOverview(user),
    ]);

    return NextResponse.json({
      groups: Array.isArray(groups) ? groups.length : 0,
      students: Array.isArray(students) ? students.length : 0,
      sessionsToday: Array.isArray(sessions)
        ? sessions.filter((s) => s.students.length > 0).length
        : 0,
      unpaid: payments?.unpaid_count || 0,
    });
  } catch (e) {
    if (e instanceof QueryError) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    throw e;
  }
}
