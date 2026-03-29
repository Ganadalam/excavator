import { writeBackup } from "@/lib/backup";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteEquipment, upsertEquipment } from "@/lib/db";
import { equipmentSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  try {
    const body   = await req.json();
    const parsed = equipmentSchema.safeParse({ ...body, id: numId });
    if (!parsed.success)
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    const eq = await upsertEquipment(session.sub, parsed.data);
    await writeBackup();
    return NextResponse.json({ ok: true, data: eq });
  } catch {
    return NextResponse.json({ ok: false, error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteEquipment(session.sub, Number(id));
  if (!ok) return NextResponse.json({ ok: false, error: "작업 기록이 있는 장비는 삭제할 수 없습니다" }, { status: 409 });
  await writeBackup();
  return NextResponse.json({ ok: true });
}
