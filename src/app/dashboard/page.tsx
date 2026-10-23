import Shell from "../Shell";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "../LogoutButton";

export default async function Dashboard() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <Shell><main>
      <h1>Halo, @{u.username}</h1>
      <p>Dashboard (tahap 2 akan menambahkan link & profil).</p>
      <LogoutButton />
    </main></Shell>
  );
}
