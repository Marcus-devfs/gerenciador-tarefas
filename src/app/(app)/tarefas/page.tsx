import { auth } from "@/auth";
import TarefasClient from "./TarefasClient";

export default async function TarefasPage() {
  const session = await auth();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin ?? false;
  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? "";
  const userName = session?.user?.name ?? "";

  return (
    <TarefasClient
      isAdmin={isAdmin}
      userId={userId}
      userEmail={userEmail}
      userName={userName}
    />
  );
}
