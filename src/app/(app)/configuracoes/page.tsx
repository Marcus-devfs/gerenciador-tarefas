import { auth } from "@/auth";
import ConfigClient from "./ConfigClient";

export default async function ConfiguracoesPage() {
  const session = await auth();
  return (
    <ConfigClient
      userEmail={session?.user?.email ?? ""}
      userName={session?.user?.name ?? ""}
    />
  );
}
