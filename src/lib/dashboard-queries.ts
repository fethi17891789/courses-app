import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import type { AuthUser } from "@/lib/auth-user";

/**
 * Requetes de lecture du tableau de bord, extraites VERBATIM des routes
 * /api/groups, /api/students, /api/attendance/today et /api/payments/overview.
 *
 * Ces quatre routes restent en place (d'autres ecrans les consomment) mais ne
 * sont plus que de fines enveloppes autour de ces fonctions : une seule source
 * de verite, aucun risque de divergence entre le tableau de bord et le reste.
 *
 * PERF : le tableau de bord appelait les 4 routes en parallele, soit 4 requetes
 * HTTP distinctes -> 4 verifications d'identite et 4 appels a getSchoolScope.
 * /api/dashboard les appelle desormais dans UNE SEULE requete, ou le `cache()`
 * de React reduit getSchoolScope a une unique lecture.
 */

/** Erreur de lecture -> 500 cote route. */
export class QueryError extends Error {}

export async function fetchGroups(user: AuthUser) {
  const supabase = await createClient();
  // Directeur d'ecole : lecture agregee de tous ses profs (service-role).
  // Prof normal : ses propres groupes via RLS.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: groups, error } = await db
    .from("groups")
    .select("*, group_members(count)")
    .in("teacher_id", teacherIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new QueryError();
  }

  const formatted = (groups || []).map((g) => ({
    ...g,
    member_count: g.group_members?.[0]?.count ?? 0,
    group_members: undefined,
  }));

  return (formatted);
}

export async function fetchStudents(user: AuthUser, search?: string, level?: string) {
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
    throw new QueryError();
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

  return (formatted);
}

export async function fetchTodaySessions(user: AuthUser) {
  // Directeur : appel du jour UNIFIE de toute l'ecole. Prof salarie : le sien.
  // On lit toujours via service-role (scope par teacherIds) pour que les eleves
  // PARTAGES (dossier appartenant a un autre prof mais inscrit dans un groupe de
  // la portee) soient bien resolus dans l'embed (sinon la RLS les masque et la
  // seance apparait vide/absente).
  const scope = await getSchoolScope(user.id);
  const db = getSupabaseAdmin();
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  // Use Algeria timezone (UTC+1) to get the correct day
  const now = new Date();
  const algeriaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Algiers" }));
  const dayOfWeek = algeriaTime.getDay();

  const { data: groups, error } = await db
    .from("groups")
    .select("id, name, schedules, price, payment_mode, refund_absences, teacher_id, group_members(id, student_id, enrolled_sessions, student:students(id, full_name, phone, level))")
    .in("teacher_id", teacherIds);

  if (error) {
    throw new QueryError();
  }

  const today = algeriaTime.toISOString().split("T")[0];

  const { data: attendanceToday } = await db
    .from("attendance")
    .select("group_id, session_day, session_time, student_id")
    .in("teacher_id", teacherIds)
    .eq("session_date", today);

  // Map: "groupId-day-time" -> Set of student_ids already called.
  // session_time distinguishes multiple sessions on the same day.
  const calledMap = new Map<string, Set<string>>();
  for (const a of attendanceToday || []) {
    const key = `${a.group_id}-${a.session_day}-${a.session_time ?? ""}`;
    if (!calledMap.has(key)) calledMap.set(key, new Set());
    calledMap.get(key)!.add(a.student_id);
  }

  // Get payments for current month and current week
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const weekStart = new Date(algeriaTime);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: recentPayments } = await db
    .from("payments")
    .select("group_id, student_id, session_date")
    .in("teacher_id", teacherIds)
    .gte("session_date", `${currentMonth}-01`);

  // Map: "groupId-studentId" -> payment dates
  const paymentMap = new Map<string, string[]>();
  for (const p of recentPayments || []) {
    const key = `${p.group_id}-${p.student_id}`;
    if (!paymentMap.has(key)) paymentMap.set(key, []);
    paymentMap.get(key)!.push(p.session_date);
  }

  // Get attendance for current period (month) to count presences for refund calculation
  const { data: periodAttendance } = await db
    .from("attendance")
    .select("group_id, student_id, session_day, session_date, status")
    .in("teacher_id", teacherIds)
    .gte("session_date", `${currentMonth}-01`);

  // Map: "groupId-studentId" -> { present: number, total: number }
  const presenceMap = new Map<string, { present: number; total: number }>();
  for (const a of periodAttendance || []) {
    const key = `${a.group_id}-${a.student_id}`;
    if (!presenceMap.has(key)) presenceMap.set(key, { present: 0, total: 0 });
    const entry = presenceMap.get(key)!;
    entry.total++;
    if (a.status === "present") entry.present++;
  }

  // Helper: check if today is the last session of the period for a group
  function isLastSessionOfPeriod(groupSchedules: any[], mode: string): boolean {
    if (mode === "per_session") return true; // always charge

    const scheduleDays = groupSchedules.map((s: any) => s.day).sort((a: number, b: number) => a - b);

    if (mode === "weekly") {
      // Last session day of the week (highest day number still to come or today)
      const remaining = scheduleDays.filter((d: number) => d >= dayOfWeek);
      return remaining.length > 0 && remaining[remaining.length - 1] === dayOfWeek;
    }

    if (mode === "monthly") {
      // Check if there are more sessions this month after today
      const todayDate = algeriaTime.getDate();
      const lastDayOfMonth = new Date(algeriaTime.getFullYear(), algeriaTime.getMonth() + 1, 0).getDate();

      for (let d = todayDate + 1; d <= lastDayOfMonth; d++) {
        const futureDate = new Date(algeriaTime.getFullYear(), algeriaTime.getMonth(), d);
        const futureDay = futureDate.getDay();
        if (scheduleDays.includes(futureDay)) return false;
      }
      return true;
    }

    return false;
  }

  // Helper: check if today is the first session of the period for a group
  function isFirstSessionOfPeriod(groupSchedules: any[], mode: string): boolean {
    if (mode === "per_session") return true;

    const scheduleDays = groupSchedules.map((s: any) => s.day).sort((a: number, b: number) => a - b);

    if (mode === "weekly") {
      const first = scheduleDays.find((d: number) => d >= 0);
      return first === dayOfWeek;
    }

    if (mode === "monthly") {
      const todayDate = algeriaTime.getDate();
      for (let d = 1; d < todayDate; d++) {
        const pastDate = new Date(algeriaTime.getFullYear(), algeriaTime.getMonth(), d);
        if (scheduleDays.includes(pastDate.getDay())) return false;
      }
      return true;
    }

    return false;
  }

  // Helper: count total sessions in the current period for a group
  function totalSessionsInPeriod(groupSchedules: any[], mode: string): number {
    const scheduleDays = groupSchedules.map((s: any) => s.day);

    if (mode === "weekly") {
      return scheduleDays.length;
    }

    if (mode === "monthly") {
      let count = 0;
      const year = algeriaTime.getFullYear();
      const month = algeriaTime.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const date = new Date(year, month, d);
        if (scheduleDays.includes(date.getDay())) count++;
      }
      return count;
    }

    return 1;
  }

  const sessions = [];

  for (const group of groups || []) {
    const schedules = group.schedules || [];
    for (let scheduleIdx = 0; scheduleIdx < schedules.length; scheduleIdx++) {
      const schedule = schedules[scheduleIdx];
      if (schedule.day !== dayOfWeek) continue;

      const isLastSession = isLastSessionOfPeriod(schedules, group.payment_mode);
      const isFirstSession = isFirstSessionOfPeriod(schedules, group.payment_mode);
      const totalSessions = totalSessionsInPeriod(schedules, group.payment_mode);

      // enrolled_sessions holds session indices (positions in schedules).
      // null/empty means enrolled in every session.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const students = (group.group_members || [])
        .filter((m: any) => {
          if (!m.enrolled_sessions || m.enrolled_sessions.length === 0) return true;
          return m.enrolled_sessions.includes(scheduleIdx);
        })
        .map((m: any) => {
          const s = m.student;
          if (!s) return null;
          const payKey = `${group.id}-${s.id}`;
          const payDates = paymentMap.get(payKey) || [];
          const presence = presenceMap.get(payKey) || { present: 0, total: 0 };

          let paymentDue = false;
          let paymentAmount = group.price;

          if (group.payment_mode === "per_session") {
            paymentDue = true;
            paymentAmount = group.price;
          } else if (group.payment_mode === "monthly") {
            const alreadyPaid = payDates.some((d: string) => d.startsWith(currentMonth));
            if (group.refund_absences) {
              // Refund ON: pay at last session with adjusted amount
              paymentDue = !alreadyPaid && isLastSession;
              if (paymentDue && totalSessions > 0) {
                const presentCount = presence.present + 1;
                paymentAmount = Math.round((group.price / totalSessions) * presentCount);
              }
            } else {
              // Refund OFF: pay at first session, fixed price
              paymentDue = !alreadyPaid && isFirstSession;
            }
          } else if (group.payment_mode === "weekly") {
            const alreadyPaid = payDates.some((d: string) => d >= weekStartStr);
            if (group.refund_absences) {
              paymentDue = !alreadyPaid && isLastSession;
              if (paymentDue && totalSessions > 0) {
                const presentCount = presence.present + 1;
                paymentAmount = Math.round((group.price / totalSessions) * presentCount);
              }
            } else {
              paymentDue = !alreadyPaid && isFirstSession;
            }
          }

          return { ...s, payment_due: paymentDue, payment_amount: paymentAmount };
        })
        .filter(Boolean);

      const sessionKey = `${group.id}-${schedule.day}-${schedule.start_time ?? ""}`;
      const calledIds = calledMap.get(sessionKey) || new Set();
      const completed = students.length > 0 && students.every((s: any) => calledIds.has(s.id));
      const calledStudentIds = Array.from(calledIds);

      sessions.push({
        group_id: group.id,
        group_name: group.name,
        day: schedule.day,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        price: group.price,
        payment_mode: group.payment_mode,
        students,
        completed,
        called_student_ids: calledStudentIds,
        teacher_id: group.teacher_id,
      });
    }
  }

  sessions.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (sessions);
}

export async function fetchPaymentsOverview(user: AuthUser, groupFilter: string | null = null) {
  // Directeur : suivi des paiements UNIFIE de toute l'ecole. Prof salarie : le
  // sien. Lecture via service-role (scope par teacherIds) pour resoudre les
  // eleves partages dans l'embed group_members -> students.
  const scope = await getSchoolScope(user.id);
  const db = getSupabaseAdmin();
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  // Get all groups for filter dropdown
  const { data: groups } = await db
    .from("groups")
    .select("id, name, price, payment_mode, refund_absences, schedules, teacher_id")
    .in("teacher_id", teacherIds);

  const scopeGroupIds = (groups || []).map((g: { id: string }) => g.id);

  // Get all attendance records (to know which sessions have been called)
  let attendanceQuery = db
    .from("attendance")
    .select("id, group_id, student_id, session_day, session_date, status")
    .in("teacher_id", teacherIds);

  if (groupFilter) {
    attendanceQuery = attendanceQuery.eq("group_id", groupFilter);
  }

  const { data: attendance } = await attendanceQuery;

  // Get all payments
  let paymentsQuery = db
    .from("payments")
    .select("id, group_id, student_id, amount, session_date")
    .in("teacher_id", teacherIds);

  if (groupFilter) {
    paymentsQuery = paymentsQuery.eq("group_id", groupFilter);
  }

  const { data: payments } = await paymentsQuery;

  // Get all members with student info (scoped to the groups in range).
  const membersQuery = db
    .from("group_members")
    .select("group_id, student_id, student:students(id, full_name, phone, level)")
    .in("group_id", groupFilter ? [groupFilter] : scopeGroupIds);

  const { data: members } = await membersQuery;

  // Filter members to only include groups owned by this teacher
  const teacherGroupIds = new Set((groups || []).map((g: any) => g.id));
  const validMembers = (members || []).filter((m: any) => teacherGroupIds.has(m.group_id));

  // Build payment map: "studentId-groupId" -> total paid
  const paidMap = new Map<string, number>();
  for (const p of payments || []) {
    const key = `${p.student_id}-${p.group_id}`;
    paidMap.set(key, (paidMap.get(key) || 0) + Number(p.amount));
  }

  // Build attendance map: "studentId-groupId" -> number of sessions attended (present)
  const attendedMap = new Map<string, number>();
  const calledMap = new Map<string, number>();
  for (const a of attendance || []) {
    const key = `${a.student_id}-${a.group_id}`;
    calledMap.set(key, (calledMap.get(key) || 0) + 1);
    if (a.status === "present") {
      attendedMap.set(key, (attendedMap.get(key) || 0) + 1);
    }
  }

  // Calculate debts per student
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentDebts: any[] = [];
  const seen = new Set<string>();

  for (const m of validMembers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = m.student as any;
    if (!student) continue;

    const key = `${student.id}-${m.group_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const group = (groups || []).find((g: any) => g.id === m.group_id);
    if (!group) continue;

    const sessionsCalled = calledMap.get(key) || 0;
    if (sessionsCalled === 0) continue;

    const totalPaid = paidMap.get(key) || 0;

    // Get this student's attendance records for this group
    const studentAttendance = (attendance || []).filter(
      (a: any) => a.student_id === student.id && a.group_id === m.group_id
    );

    // Get this student's payment dates for this group
    const studentPayments = (payments || []).filter(
      (p: any) => p.student_id === student.id && p.group_id === m.group_id
    );
    const paidDates = new Set(studentPayments.map((p: any) => p.session_date));

    // Build unpaid sessions list
    const unpaidSessions: { date: string; day: number; amount: number }[] = [];

    if (group.payment_mode === "per_session") {
      // Each present session without a matching payment date
      for (const a of studentAttendance) {
        if (a.status === "present" && !paidDates.has(a.session_date)) {
          unpaidSessions.push({ date: a.session_date, day: a.session_day, amount: group.price });
        }
      }
    } else {
      // Monthly/weekly: group by period
      const periods = new Map<string, { present: number; total: number; dates: string[] }>();

      for (const a of studentAttendance) {
        let periodKey: string;
        if (group.payment_mode === "monthly") {
          periodKey = a.session_date.slice(0, 7); // "YYYY-MM"
        } else {
          // Weekly: get week start (Sunday)
          const d = new Date(a.session_date);
          d.setDate(d.getDate() - d.getDay());
          periodKey = d.toISOString().split("T")[0];
        }
        if (!periods.has(periodKey)) periods.set(periodKey, { present: 0, total: 0, dates: [] });
        const p = periods.get(periodKey)!;
        p.total++;
        if (a.status === "present") p.present++;
        p.dates.push(a.session_date);
      }

      for (const [periodKey, info] of periods) {
        // Check if already paid for this period
        const hasPaid = info.dates.some((d) => paidDates.has(d)) ||
          studentPayments.some((p: any) => {
            if (group.payment_mode === "monthly") return p.session_date.startsWith(periodKey);
            return p.session_date >= periodKey;
          });
        if (hasPaid) continue;

        let amount = group.price;
        if (group.refund_absences) {
          const scheduleDays = (group.schedules || []).length;
          const totalInPeriod = group.payment_mode === "monthly"
            ? (() => {
                const [y, mo] = periodKey.split("-").map(Number);
                const lastDay = new Date(y, mo, 0).getDate();
                let count = 0;
                for (let d = 1; d <= lastDay; d++) {
                  const date = new Date(y, mo - 1, d);
                  if ((group.schedules || []).some((s: any) => s.day === date.getDay())) count++;
                }
                return count;
              })()
            : scheduleDays;
          if (totalInPeriod > 0) {
            amount = Math.round((group.price / totalInPeriod) * info.present);
          }
        }

        if (amount > 0) {
          const label = group.payment_mode === "monthly" ? periodKey : periodKey;
          unpaidSessions.push({ date: label, day: -1, amount });
        }
      }
    }

    const debt = unpaidSessions.reduce((sum, s) => sum + s.amount, 0);
    if (debt > 0) {
      studentDebts.push({
        student_id: student.id,
        student_name: student.full_name,
        student_level: student.level,
        group_id: m.group_id,
        group_name: group.name,
        teacher_id: group.teacher_id,
        total_due: totalPaid + debt,
        total_paid: totalPaid,
        debt,
        unpaid_sessions: unpaidSessions,
      });
    }
  }

  studentDebts.sort((a, b) => b.debt - a.debt);

  return ({
    groups: (groups || []).map((g: any) => ({ id: g.id, name: g.name })),
    unpaid_count: studentDebts.length,
    debts: studentDebts,
  });
}