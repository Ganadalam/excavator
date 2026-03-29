import { writeBackup } from "@/lib/backup";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEquipments, upsertEquipment } from "@/lib/db";
import { equipmentSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const equipments = await getEquipments(session.sub);
  return NextResponse.json({ ok: true, data: equipments });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body   = await req.json();
    const parsed = equipmentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
    const eq = await upsertEquipment(session.sub, parsed.data);
    await writeBackup();
    return NextResponse.json({ ok: true, data: eq }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "서버 오류" }, { status: 500 });
  }
}
