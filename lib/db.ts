/**
 * lib/db.ts — Prisma + SQLite data access layer.
 *
 * Same function signatures as the old JSON-based version,
 * so no changes needed in API routes or components.
 *
 * To switch to PostgreSQL:
 *  1. Change datasource.provider to "postgresql" in prisma/schema.prisma
 *  2. Set DATABASE_URL to your Postgres connection string
 *  3. Run: npx prisma migrate dev
 */
import { prisma } from "@/lib/prisma";
import type { User, UserData, Company, Equipment, Work, MaintenanceLog } from "@/types";

// ── Helpers ────────────────────────────────────────────────

/** Convert Prisma User row → domain User type */
function toUser(row: {
  id: string; username: string; name: string; passwordHash: string;
  role: string; isActive: boolean; createdAt: Date;
}): User {
  return {
    ...row,
    role: row.role as "admin" | "user",
    createdAt: row.createdAt.toISOString(),
  };
}

/** Convert Prisma Work row → domain Work */
function toWork(row: {
  id: number; userId: string; companyId: number; equipmentId: number;
  date: string; rate: number; otr: number; hours: number; ohours: number;
  fuel: number; extra: number; note: string;
}): Work {
  return {
    id: row.id, date: row.date, companyId: row.companyId,
    equipmentId: row.equipmentId, rate: row.rate, otr: row.otr,
    hours: row.hours, ohours: row.ohours, fuel: row.fuel,
    extra: row.extra, note: row.note,
  };
}

/** Convert Prisma Company row → domain Company */
function toCompany(row: {
  id: number; name: string; manager: string; contact: string; bizNo: string;
  contractStart: string; address: string; mainContract: string; note: string;
}): Company {
  return { id: row.id, name: row.name, manager: row.manager, contact: row.contact,
    bizNo: row.bizNo, contractStart: row.contractStart, address: row.address,
    mainContract: row.mainContract, note: row.note };
}

/** Convert Prisma Equipment row (with maintLogs) → domain Equipment */
function toEquipment(row: {
  id: number; name: string; type: string; model: string; year: number;
  regno: string; operator: string; rate: number; baseFuel: number;
  insurer: string; insExpiry: string; insFee: number; inspLast: string; inspNext: string;
  lease: number; parking: number; fixedOther: number;
  maintLast: string; maintNext: string; utilRate: number; note: string;
  maintLogs?: { id: number; date: string; type: string; cost: number; shop: string; note: string }[];
}): Equipment {
  return {
    id: row.id, name: row.name, type: row.type as Equipment["type"],
    model: row.model, year: row.year, regno: row.regno, operator: row.operator,
    rate: row.rate, baseFuel: row.baseFuel, insurer: row.insurer,
    insExpiry: row.insExpiry, insFee: row.insFee, inspLast: row.inspLast,
    inspNext: row.inspNext, lease: row.lease, parking: row.parking,
    fixedOther: row.fixedOther, maintLast: row.maintLast, maintNext: row.maintNext,
    utilRate: row.utilRate, note: row.note,
    maintLogs: (row.maintLogs ?? []).map((l) => ({
      id: l.id, date: l.date, type: l.type, cost: l.cost, shop: l.shop, note: l.note,
    })),
  };
}

// ── User store ─────────────────────────────────────────────

export async function getAllUsers(): Promise<Record<string, User>> {
  const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return Object.fromEntries(rows.map((r) => [r.id, toUser(r)]));
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUser(row) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { username } });
  return row ? toUser(row) : null;
}

export async function saveUser(user: User): Promise<void> {
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id, username: user.username, name: user.name,
      passwordHash: user.passwordHash, role: user.role,
      isActive: user.isActive,
    },
    update: {
      username: user.username, name: user.name,
      passwordHash: user.passwordHash, role: user.role,
      isActive: user.isActive,
    },
  });
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getUserCount(): Promise<number> {
  return prisma.user.count();
}

export async function getUserStats(userId: string): Promise<{
  worksCount: number; companiesCount: number; equipmentsCount: number;
}> {
  const [worksCount, companiesCount, equipmentsCount] = await Promise.all([
    prisma.work.count({ where: { userId } }),
    prisma.company.count({ where: { userId } }),
    prisma.equipment.count({ where: { userId } }),
  ]);
  return { worksCount, companiesCount, equipmentsCount };
}

// ── getUserData — returns all data for a user ─────────────

export async function getUserData(userId: string): Promise<UserData> {
  const [companies, equipments, works] = await Promise.all([
    getCompanies(userId),
    getEquipments(userId),
    getWorks(userId),
  ]);
  return { companies, equipments, works };
}

// ── Companies ──────────────────────────────────────────────

export async function getCompanies(userId: string): Promise<Company[]> {
  const rows = await prisma.company.findMany({
    where: { userId },
    orderBy: { id: "asc" },
  });
  return rows.map(toCompany);
}

export async function upsertCompany(
  userId: string,
  company: Omit<Company, "id"> & { id?: number }
): Promise<Company> {
  if (company.id) {
    const row = await prisma.company.update({
      where: { id: company.id },
      data: { name: company.name, manager: company.manager, contact: company.contact,
        bizNo: company.bizNo, contractStart: company.contractStart,
        address: company.address, mainContract: company.mainContract, note: company.note },
    });
    return toCompany(row);
  }
  const row = await prisma.company.create({
    data: { userId, name: company.name, manager: company.manager, contact: company.contact,
      bizNo: company.bizNo, contractStart: company.contractStart,
      address: company.address, mainContract: company.mainContract, note: company.note },
  });
  return toCompany(row);
}

export async function deleteCompany(userId: string, id: number): Promise<boolean> {
  const used = await prisma.work.count({ where: { userId, companyId: id } });
  if (used > 0) return false;
  await prisma.company.delete({ where: { id } });
  return true;
}

// ── Equipments ─────────────────────────────────────────────

export async function getEquipments(userId: string): Promise<Equipment[]> {
  const rows = await prisma.equipment.findMany({
    where: { userId },
    include: { maintLogs: { orderBy: { createdAt: "desc" } } },
    orderBy: { id: "asc" },
  });
  return rows.map(toEquipment);
}

export async function upsertEquipment(
  userId: string,
  eq: Omit<Equipment, "id"> & { id?: number }
): Promise<Equipment> {
  const data = {
    name: eq.name, type: eq.type, model: eq.model, year: eq.year,
    regno: eq.regno, operator: eq.operator, rate: eq.rate, baseFuel: eq.baseFuel,
    insurer: eq.insurer, insExpiry: eq.insExpiry, insFee: eq.insFee,
    inspLast: eq.inspLast, inspNext: eq.inspNext, lease: eq.lease,
    parking: eq.parking, fixedOther: eq.fixedOther, maintLast: eq.maintLast,
    maintNext: eq.maintNext, utilRate: eq.utilRate, note: eq.note,
  };

  if (eq.id) {
    // Update equipment fields + sync maintLogs
    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({ where: { id: eq.id }, data });
      // Full replace of maintLogs
      await tx.maintenanceLog.deleteMany({ where: { equipmentId: eq.id } });
      if (eq.maintLogs.length > 0) {
        await tx.maintenanceLog.createMany({
          data: eq.maintLogs.map((l) => ({
            equipmentId: eq.id!,
            date: l.date, type: l.type, cost: l.cost, shop: l.shop, note: l.note,
          })),
        });
      }
    });
    const row = await prisma.equipment.findUnique({
      where: { id: eq.id },
      include: { maintLogs: { orderBy: { createdAt: "desc" } } },
    });
    return toEquipment(row!);
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.equipment.create({ data: { userId, ...data } });
    if (eq.maintLogs.length > 0) {
      await tx.maintenanceLog.createMany({
        data: eq.maintLogs.map((l) => ({
          equipmentId: created.id,
          date: l.date, type: l.type, cost: l.cost, shop: l.shop, note: l.note,
        })),
      });
    }
    return tx.equipment.findUnique({
      where: { id: created.id },
      include: { maintLogs: { orderBy: { createdAt: "desc" } } },
    });
  });
  return toEquipment(row!);
}

export async function deleteEquipment(userId: string, id: number): Promise<boolean> {
  const used = await prisma.work.count({ where: { userId, equipmentId: id } });
  if (used > 0) return false;
  await prisma.equipment.delete({ where: { id } });
  return true;
}

// ── Works ──────────────────────────────────────────────────

export async function getWorks(userId: string): Promise<Work[]> {
  const rows = await prisma.work.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
  return rows.map(toWork);
}

export async function upsertWork(
  userId: string,
  work: Omit<Work, "id"> & { id?: number }
): Promise<Work> {
  const data = {
    date: work.date, companyId: work.companyId, equipmentId: work.equipmentId,
    rate: work.rate, otr: work.otr, hours: work.hours, ohours: work.ohours,
    fuel: work.fuel, extra: work.extra, note: work.note,
  };
  if (work.id) {
    const row = await prisma.work.update({ where: { id: work.id }, data });
    return toWork(row);
  }
  const row = await prisma.work.create({ data: { userId, ...data } });
  return toWork(row);
}

export async function deleteWork(userId: string, id: number): Promise<void> {
  await prisma.work.delete({ where: { id } });
}
