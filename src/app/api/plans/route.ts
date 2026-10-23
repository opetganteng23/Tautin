import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { publicPlan } from "@/lib/publicplan";
import type { Plan } from "@/lib/types";

/** Daftar paket publik (untuk halaman harga). */
export async function GET() {
  const db = await getDb();
  const plans = await db.collection<Plan>("plans").find({ isActive: true }).sort({ priceMonthly: 1 }).toArray();
  return NextResponse.json(plans.map(publicPlan));
}

