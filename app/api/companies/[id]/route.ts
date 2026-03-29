import { writeBackup } from "@/lib/backup";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteCompany, upsertCompany } from "@/lib/db";
import { companySchema } from "@/lib/validations";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteCompany(session.sub, Number(id));
  if (!ok) return NextResponse.json({ ok: false, error: "해당 업체에 작업 기록이 있어 삭제할 수 없습니다" }, { status: 409 });
  await writeBackup();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body   = await req.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const company = await upsertCompany(session.sub, { ...parsed.data, id: Number(id) });
    await writeBackup();
    return NextResponse.json({ ok: true, data: company });
  } catch {
    return NextResponse.json({ ok: false, error: "업체를 찾을 수 없습니다" }, { status: 404 });
  }
}
