/**
 * GET /api/health
 * Returns DB connection status. Use to diagnose deployment issues.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "connected",
      env: {
        hasDbUrl:     !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv:      process.env.NODE_ENV,
      },
    });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json({
      ok: false,
      db: "error",
      error: err instanceof Error ? err.message : String(err),
      env: {
        hasDbUrl:     !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv:      process.env.NODE_ENV,
      },
    }, { status: 503 });
  }
}
