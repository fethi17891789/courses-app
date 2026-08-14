import { getAuthUser } from "@/lib/auth-user";
import { fetchPaymentsOverview, QueryError } from "@/lib/dashboard-queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupFilter = searchParams.get("group") || null;

  try {
    return NextResponse.json(await fetchPaymentsOverview(user, groupFilter));
  } catch (e) {
    if (e instanceof QueryError) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    throw e;
  }
}
