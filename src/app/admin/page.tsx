import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import AppFrame from "../AppFrame";
import AdminApp from "./AdminApp";

export const metadata = { title: "Admin · Tautin" };

export default async function Admin() {
  const u = await requireAdmin();
  if (!u) redirect("/dashboard");
  return (
    <AppFrame badge="admin">
      <AdminApp />
    </AppFrame>
  );
}
