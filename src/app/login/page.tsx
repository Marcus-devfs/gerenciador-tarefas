import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session) redirect("/");

  const { error } = await searchParams;

  return <LoginClient authError={error ?? null} />;
}
