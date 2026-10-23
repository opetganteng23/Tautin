import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  return NextResponse.json({
    id: u._id.toString(), email: u.email, username: u.username, role: u.role,
    planId: u.planId, planExpiresAt: u.planExpiresAt,
  });
}
