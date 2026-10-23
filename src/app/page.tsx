import Shell from "./Shell";
import Link from "next/link";

export default function Home() {
  return (
    <Shell><main>
      <h1>Tautin</h1>
      <p>Satu link untuk semua tautanmu.</p>
      <p><Link href="/register">Daftar</Link> · <Link href="/login">Masuk</Link></p>
    </main></Shell>
  );
}
