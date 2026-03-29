import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const user = await getUserById(session.sub);
  if (!user)  return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  if (user.isActive === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, data: { id: user.id, username: user.username, name: user.name, role: user.role, isActive: user.isActive } });
}
