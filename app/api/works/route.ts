import { writeBackup } from "@/lib/backup";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorks, upsertWork } from "@/lib/db";
import { workSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const works = await getWorks(session.sub);
  return NextResponse.json({ ok: true, data: works });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body   = await req.json();
    const parsed = workSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    const work = await upsertWork(session.sub, parsed.data);
    await writeBackup();
    return NextResponse.json({ ok: true, data: work }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "서버 오류" }, { status: 500 });
  }
}
