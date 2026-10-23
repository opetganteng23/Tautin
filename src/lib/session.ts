import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import type { User } from "./types";

export const COOKIE = "tautin_session";
const MAX_AGE = 60 * 60 * 24 * 14;
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function createSession(user: Pick<User, "_id" | "role">) {
  const jwt = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** User aktif dari cookie; null bila tidak login / disuspend. */
export async function getCurrentUser(): Promise<User | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c, key());
    const db = await getDb();
    const u = await db.collection<User>("users").findOne({ _id: new ObjectId(payload.sub) });
    return u && u.status === "active" ? u : null;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const u = await getCurrentUser();
  return u?.role === "admin" ? u : null;
}
