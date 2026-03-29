import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { AuthPayload, SafeUser } from "@/types";

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production")
      throw new Error("JWT_SECRET must be ≥32 chars in production");
    return new TextEncoder().encode("exmgmt-dev-secret-change-in-production-32chars!!");
  }
  return new TextEncoder().encode(s);
};

const COOKIE_NAME = "exmgmt_token";
const TOKEN_TTL   = 60 * 60 * 24 * 7;
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string)            { return bcrypt.hash(plain, SALT_ROUNDS); }
export async function verifyPassword(plain: string, hash: string) { return bcrypt.compare(plain, hash); }

export async function signToken(user: SafeUser & { createdAt: string }): Promise<string> {
  return new SignJWT({ sub: user.id, name: user.name, role: user.role ?? "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AuthPayload;
  } catch { return null; }
}

export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_TTL,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
}

export async function getAuthCookie()  {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getSession(): Promise<AuthPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}

export async function verifySessionToken(token: string) { return verifyToken(token); }
