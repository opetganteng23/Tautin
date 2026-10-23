import Shell from "../Shell";
import ReportForm from "./ReportForm";

export const metadata = { title: "Laporkan profil · Tautin" };

export default async function Report({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  return (
    <Shell>
      <main>
        <h1>Laporkan profil</h1>
        <ReportForm username={(u ?? "").slice(0, 40)} />
      </main>
    </Shell>
  );
}
