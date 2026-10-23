import Link from "next/link";
import Shell from "./Shell";

const FEATURES = [
  "Satu halaman untuk semua link: Instagram, TikTok, toko, portofolio",
  "Tema 3D yang bisa kamu atur sesuai gaya",
  "Statistik klik dan pengunjung",
  "Bayar sekali per bulan atau tahun lewat QRIS & Virtual Account",
];

export default function Home() {
  return (
    <Shell>
      <main>
        <h1>Satu link untuk semua tautanmu</h1>
        <ul className="feat">
          {FEATURES.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <div className="cta">
          <Link href="/register" className="btn">Daftar gratis</Link>
          <Link href="/login" className="btn alt">Masuk</Link>
        </div>
        <p><Link href="/pricing">Lihat paket &amp; harga</Link></p>
      </main>
    </Shell>
  );
}
