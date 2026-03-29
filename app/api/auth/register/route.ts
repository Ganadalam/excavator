import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { getUserByUsername, getUserCount } from "@/lib/db";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );

    const { username, name, password } = parsed.data;

    // Check duplicate
    const existing = await getUserByUsername(username);
    if (existing)
      return NextResponse.json(
        { ok: false, error: "이미 사용 중인 아이디입니다" },
        { status: 409 }
      );

    // First user → admin
    const count        = await getUserCount();
    const isFirstUser  = count === 0;
    const passwordHash = await hashPassword(password);
    const role         = isFirstUser ? "admin" : "user";

    // Direct Prisma create (bypasses saveUser's upsert)
    const user = await prisma.user.create({
      data: { username, name, passwordHash, role, isActive: true },
    });

    const token = await signToken({
      id:        user.id,
      username:  user.username,
      name:      user.name,
      createdAt: user.createdAt.toISOString(),
      role:      user.role as "admin" | "user",
      isActive:  user.isActive,
    });
    await setAuthCookie(token);

    return NextResponse.json(
      { ok: true, data: { id: user.id, name, username, role, isActive: true } },
      { status: 201 }
    );
  } catch (err) {
    // Log the real error for Vercel Functions logs
    console.error("[register]", err);
    const message = err instanceof Error ? err.message : String(err);
    // Expose readable message in dev, hide in prod
    const clientMsg = process.env.NODE_ENV === "production"
      ? "서버 오류가 발생했습니다"
      : `서버 오류: ${message}`;
    return NextResponse.json({ ok: false, error: clientMsg }, { status: 500 });
  }
}
