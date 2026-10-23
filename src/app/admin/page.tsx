import Shell from "../Shell";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import LogoutButton from "../LogoutButton";

export default async function Admin() {
  const u = await requireAdmin();
  if (!u) redirect("/dashboard");
  return (
    <Shell><main>
      <h1>Admin</h1>
      <p>Dashboard admin (tahap 6).</p>
      <LogoutButton />
    </main></Shell>
  );
}
