import { writeBackup } from "@/lib/backup";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteWork, upsertWork } from "@/lib/db";
import { workSchema } from "@/lib/validations";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteWork(session.sub, Number(id));
  await writeBackup();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body   = await req.json();
  const parsed = workSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const work = await upsertWork(session.sub, { ...parsed.data, id: Number(id) });
    await writeBackup();
    return NextResponse.json({ ok: true, data: work });
  } catch {
    return NextResponse.json({ ok: false, error: "작업을 찾을 수 없습니다" }, { status: 404 });
  }
}
