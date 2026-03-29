/**
 * /api/emergency
 * DB 장애 시 자동 생성된 JSON 백업을 반환합니다.
 * JWT 쿠키 인증을 시도하되, DB 연결 실패 시에도 파일 백업을 반환합니다.
 */
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import fs   from "fs";
import path from "path";

const BACKUP_DIR  = path.join(process.cwd(), ".backup");
const BACKUP_FILE = path.join(BACKUP_DIR, "emergency.json");

export async function GET() {
  // Auth via cookie (best-effort — don't hit DB)
  try {
    const store = await cookies();
    const token = store.get("exmgmt_token")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "로그인이 필요합니다" }, { status: 401 });
    const payload = await verifySessionToken(token);
    if (!payload) return NextResponse.json({ ok: false, error: "세션이 만료되었습니다" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ ok: false, error: "관리자만 접근할 수 있습니다" }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, error: "인증 오류" }, { status: 401 });
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    return NextResponse.json({ ok: false, error: "백업 파일이 없습니다. 정상 운영 중에는 자동으로 생성됩니다." }, { status: 404 });
  }

  try {
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
    return NextResponse.json({ ok: true, data, backedUpAt: data._backedUpAt });
  } catch {
    return NextResponse.json({ ok: false, error: "백업 파일을 읽을 수 없습니다" }, { status: 500 });
  }
}
