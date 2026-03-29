import { PrismaClient } from "@prisma/client";

// Prevent multiple PrismaClient instances in Next.js dev hot-reload
// In production (Vercel serverless), each function invocation is fresh anyway

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
