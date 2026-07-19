import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CadastroClient from "./CadastroClient";

export default async function CadastroPage() {
  const session = await auth();
  if (session) redirect("/");

  return <CadastroClient />;
}
