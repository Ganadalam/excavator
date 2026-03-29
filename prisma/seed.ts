/**
 * prisma/seed.ts
 * Run: npm run db:seed
 *
 * Creates a default admin account if no users exist.
 * Useful for fresh deployments.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`✓ Already has ${count} user(s). Skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash("admin1234", 12);
  const admin = await prisma.user.create({
    data: {
      username:     "admin",
      name:         "관리자",
      passwordHash,
      role:         "admin",
      isActive:     true,
    },
  });

  console.log(`✓ Default admin created:`);
  console.log(`  ID:       ${admin.id}`);
  console.log(`  Username: admin`);
  console.log(`  Password: admin1234  ← 반드시 로그인 후 변경하세요!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
