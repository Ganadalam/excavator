import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { getUserById, saveUser, deleteUser, getAllUsers } from "@/lib/db";
import { z } from "zod";

async function guard(targetId: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401, session: null };
  if (session.role !== "admin") return { error: "Forbidden", status: 403, session: null };
  return { error: null, status: 200, session };
}

const patchSchema = z.object({
  role:     z.enum(["admin","user"]).optional(),
  isActive: z.boolean().optional(),
  name:     z.string().min(1).max(30).optional(),
  password: z.string().min(6).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const user = await getUserById(id);
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });

  const { role, isActive, name, password } = parsed.data;

  if (role === "user" && user.role === "admin") {
    const allUsers   = await getAllUsers();
    const adminCount = Object.values(allUsers).filter((u) => u.role === "admin").length;
    if (adminCount <= 1)
      return NextResponse.json({ ok: false, error: "마지막 관리자의 권한은 변경할 수 없습니다" }, { status: 409 });
  }

  const updated = {
    ...user,
    ...(role     !== undefined ? { role }     : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(name     !== undefined ? { name }     : {}),
    ...(password !== undefined ? { passwordHash: await hashPassword(password) } : {}),
  };
  await saveUser(updated);
  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json({ ok: true, data: safe });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });
  if (g.session!.sub === id)
    return NextResponse.json({ ok: false, error: "자기 자신은 삭제할 수 없습니다" }, { status: 409 });

  const user = await getUserById(id);
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  if (user.role === "admin") {
    const allUsers   = await getAllUsers();
    const adminCount = Object.values(allUsers).filter((u) => u.role === "admin").length;
    if (adminCount <= 1)
      return NextResponse.json({ ok: false, error: "마지막 관리자는 삭제할 수 없습니다" }, { status: 409 });
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
