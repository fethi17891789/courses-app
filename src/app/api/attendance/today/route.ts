import { getAuthUser } from "@/lib/auth-user";
import { fetchTodaySessions, QueryError } from "@/lib/dashboard-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await fetchTodaySessions(user));
  } catch (e) {
    if (e instanceof QueryError) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    throw e;
  }
}
