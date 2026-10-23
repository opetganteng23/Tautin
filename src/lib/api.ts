import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const unauthorized = () => NextResponse.json({ error: "Belum login" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const oid = (s: string | undefined | null) => (s && ObjectId.isValid(s) ? new ObjectId(s) : null);
