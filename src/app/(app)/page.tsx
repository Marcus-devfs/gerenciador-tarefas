import { auth } from "@/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin ?? false;
  const userEmail = session?.user?.email ?? "";

  return <DashboardClient isAdmin={isAdmin} userEmail={userEmail} />;
}
