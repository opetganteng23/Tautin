import Link from "next/link";
import { getDb } from "@/lib/db";
import { publicPlan } from "@/lib/publicplan";
import Shell from "../Shell";
import type { Plan } from "@/lib/types";

export const metadata = { title: "Harga · Tautin" };
export const revalidate = 60;

const idr = (n: number) => (n === 0 ? "Gratis" : `Rp ${n.toLocaleString("id-ID")}`);
const ANALYTICS = { none: "Total klik per link", basic: "Statistik 7 & 30 hari", full: "Statistik lengkap (sumber, perangkat, negara)" };

export default async function Pricing() {
  const db = await getDb();
  const plans = (await db.collection<Plan>("plans").find({ isActive: true }).sort({ priceMonthly: 1 }).toArray()).map(publicPlan);
  return (
    <Shell>
      <main className="wide">
        <h1>Paket &amp; harga</h1>
        <div className="plans">
          {plans.map((p) => (
            <section key={p.id} className="plan">
              <h2>{p.name}</h2>
              <p className="price">{idr(p.priceMonthly)}{p.priceMonthly > 0 && <small> / bulan</small>}</p>
              {p.priceYearly > 0 && <p className="sub">atau {idr(p.priceYearly)} / tahun</p>}
              <ul className="feat">
                <li>Sampai {p.maxLinks} link aktif</li>
                <li>{ANALYTICS[p.analyticsLevel]}</li>
                <li>{p.allThemes ? "Semua tema, termasuk 3D premium" : "Tema dasar"}</li>
                <li>{p.removeBranding ? "Tanpa label Tautin" : "Label “Dibuat dengan Tautin”"}</li>
                {p.trialDays > 0 && <li>Coba gratis {p.trialDays} hari</li>}
              </ul>
              <Link href={p.isFree ? "/register" : "/register"} className="btn">{p.isFree ? "Mulai gratis" : "Daftar & coba"}</Link>
            </section>
          ))}
        </div>
        <p>Pembayaran prabayar lewat QRIS &amp; Virtual Account. Tidak ada tagihan otomatis.</p>
      </main>
    </Shell>
  );
}
