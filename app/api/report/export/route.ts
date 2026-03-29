import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorks, getCompanies, getEquipments } from "@/lib/db";
import { calcWork, getReportRange, filterWorksByRange } from "@/lib/utils";
import type { ReportFilter } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const filter: ReportFilter = {
    type:  (sp.get("type") as ReportFilter["type"]) ?? "month",
    year:  Number(sp.get("year"))  || new Date().getFullYear(),
    month: Number(sp.get("month")) || new Date().getMonth() + 1,
    from:  sp.get("from") ?? undefined,
    to:    sp.get("to")   ?? undefined,
  };

  const equipmentId = sp.get("equipmentId") ? Number(sp.get("equipmentId")) : null;
  const companyId   = sp.get("companyId")   ? Number(sp.get("companyId"))   : null;

  const { start, end, label } = getReportRange(filter);

  // Fetch in parallel
  const [allWorks, companies, equipments] = await Promise.all([
    getWorks(session.sub),
    getCompanies(session.sub),
    getEquipments(session.sub),
  ]);

  let works = filterWorksByRange(allWorks, start, end);
  if (equipmentId) works = works.filter((w) => w.equipmentId === equipmentId);
  if (companyId)   works = works.filter((w) => w.companyId   === companyId);

  const filterLabel = [
    label,
    equipmentId ? `장비:${equipments.find((e) => e.id === equipmentId)?.name ?? equipmentId}` : "",
    companyId   ? `업체:${companies.find((c)  => c.id === companyId)?.name  ?? companyId}`   : "",
  ].filter(Boolean).join("_");

  const rows: (string | number)[][] = [
    ["날짜","업체","장비","기본시간(h)","기본단가(원/h)","기본금액(원)",
     "초과시간(h)","초과단가(원/h)","초과금액(원)",
     "유류비(원)","추가비용(원)","청구금액(원)","계산식","메모"],
  ];

  for (const w of works) {
    const co  = companies.find((c) => c.id === w.companyId);
    const eq  = equipments.find((e) => e.id === w.equipmentId);
    const r   = Number(w.rate)   || 0;
    const otr = Number(w.otr)    || r * 1.5;
    const base = Number(w.hours)  * r;
    const over = Number(w.ohours) * otr;
    const fuel = Number(w.fuel)  || 0;
    const extra = Number(w.extra) || 0;

    const formulaParts: string[] = [];
    if (base  > 0) formulaParts.push(`기본 ${w.hours}h × ${r} = ${base}`);
    if (over  > 0) formulaParts.push(`초과 ${w.ohours}h × ${otr} = ${over}`);
    if (fuel  > 0) formulaParts.push(`유류 ${fuel}`);
    if (extra > 0) formulaParts.push(`추가 ${extra}`);

    rows.push([
      w.date, co?.name ?? "", eq?.name ?? "",
      w.hours, r, base, w.ohours, otr, over,
      fuel, extra, calcWork(w),
      formulaParts.join(" + "), w.note,
    ]);
  }

  const totalBase  = works.reduce((s,w) => s + Number(w.hours||0)*Number(w.rate||0), 0);
  const totalOver  = works.reduce((s,w) => s + Number(w.ohours||0)*(Number(w.otr)||Number(w.rate||0)*1.5), 0);
  const totalFuel  = works.reduce((s,w) => s + Number(w.fuel||0), 0);
  const totalExtra = works.reduce((s,w) => s + Number(w.extra||0), 0);
  rows.push(["합계","","","","",totalBase,"","",totalOver,totalFuel,totalExtra,totalBase+totalOver+totalFuel+totalExtra,"",""]);

  const csv = "\uFEFF" + rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(","))
    .join("\r\n");

  const filename = encodeURIComponent(`작업내역_${filterLabel}_${new Date().toISOString().slice(0,10)}.csv`);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
