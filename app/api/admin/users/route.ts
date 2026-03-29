import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllUsers, getUserStats } from "@/lib/db";
import type { AdminUserView } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const usersMap = await getAllUsers();
  const views: AdminUserView[] = await Promise.all(
    Object.values(usersMap).map(async (u) => {
      const stats = await getUserStats(u.id);
      return { id: u.id, username: u.username, name: u.name,
        createdAt: u.createdAt, role: u.role, isActive: u.isActive, ...stats };
    })
  );
  views.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return NextResponse.json({ ok: true, data: views });
}
