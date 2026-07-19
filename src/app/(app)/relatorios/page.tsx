import { auth } from "@/auth";
import RelatoriosClient from "./RelatoriosClient";

export default async function RelatoriosPage() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin ?? false;
  const userEmail = session?.user?.email ?? "";
  const userName = session?.user?.name ?? userEmail;

  return <RelatoriosClient isAdmin={isAdmin} userEmail={userEmail} userName={userName} />;
}
