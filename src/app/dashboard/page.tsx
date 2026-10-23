import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AppFrame from "../AppFrame";
import DashboardApp from "./DashboardApp";

export const metadata = { title: "Dashboard · Tautin" };

export default async function Dashboard() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <AppFrame>
      <DashboardApp username={u.username} />
    </AppFrame>
  );
}
