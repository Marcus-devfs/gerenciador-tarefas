import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { changePassword } from "@/lib/users";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const newPassword = body.newPassword ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!newPassword) {
      return NextResponse.json({ error: "Informe a nova senha." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 });
    }

    const error = await changePassword(session.user.id, newPassword);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/auth/password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
