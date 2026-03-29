import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import { getUserByUsername } from "@/lib/db";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );

    const { username, password } = parsed.data;
    const user = await getUserByUsername(username);

    if (!user) {
      // Timing-safe: always run bcrypt even for unknown users
      await verifyPassword(password, "$2a$12$invalidhashfortimingprotection000000000000000000000000");
      return NextResponse.json(
        { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid)
      return NextResponse.json(
        { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );

    if (!user.isActive)
      return NextResponse.json(
        { ok: false, error: "비활성화된 계정입니다. 관리자에게 문의하세요" },
        { status: 403 }
      );

    const token = await signToken({
      id:        user.id,
      username:  user.username,
      name:      user.name,
      createdAt: user.createdAt,
      role:      user.role,
      isActive:  user.isActive,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      ok: true,
      data: { id: user.id, name: user.name, username: user.username, role: user.role, isActive: user.isActive },
    });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ ok: false, error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
