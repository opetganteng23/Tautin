import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { forbidden } from "@/lib/api";

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const db = await getDb();
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400000);
  const [users, paid, suspended, links, clicks, openReports, blocked, revenue, revenue30, pendingOrders] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ planId: { $ne: null }, planExpiresAt: { $gt: now } }),
    db.collection("users").countDocuments({ status: "suspended" }),
    db.collection("links").countDocuments(),
    db.collection("links").aggregate([{ $group: { _id: null, n: { $sum: "$clickCount" } } }]).toArray(),
    db.collection("reports").countDocuments({ status: "open" }),
    db.collection("blocklist").countDocuments(),
    db.collection("orders").aggregate([{ $match: { status: "settlement" } }, { $group: { _id: null, n: { $sum: "$amount" } } }]).toArray(),
    db.collection("orders").aggregate([{ $match: { status: "settlement", paidAt: { $gte: since } } }, { $group: { _id: null, n: { $sum: "$amount" } } }]).toArray(),
    db.collection("orders").countDocuments({ status: "pending" }),
  ]);
  return NextResponse.json({
    users, paidUsers: paid, suspended, links, clicks: clicks[0]?.n ?? 0, openReports, blocked,
    revenue: revenue[0]?.n ?? 0, revenue30: revenue30[0]?.n ?? 0, pendingOrders,
  });
}
