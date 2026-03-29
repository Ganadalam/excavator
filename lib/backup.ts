/**
 * lib/backup.ts
 *
 * Writes a JSON snapshot of all DB data after every successful write.
 * The file is stored at .backup/emergency.json — excluded from git.
 *
 * On DB failure, /api/emergency serves this file for read-only access.
 */
import fs   from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const BACKUP_DIR  = path.join(process.cwd(), ".backup");
const BACKUP_FILE = path.join(BACKUP_DIR, "emergency.json");

export async function writeBackup(): Promise<void> {
  try {
    const [users, companies, equipments, maintLogs, works] = await Promise.all([
      prisma.user.findMany({
        select: { id:true, username:true, name:true, role:true, isActive:true, createdAt:true },
      }),
      prisma.company.findMany(),
      prisma.equipment.findMany(),
      prisma.maintenanceLog.findMany(),
      prisma.work.findMany(),
    ]);

    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const snapshot = {
      _backedUpAt: new Date().toISOString(),
      _version:    1,
      users,
      companies,
      equipments,
      maintLogs,
      works,
    };

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(snapshot, null, 2));
  } catch {
    // Backup is best-effort — never throw
  }
}
