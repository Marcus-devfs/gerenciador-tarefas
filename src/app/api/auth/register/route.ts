import { NextRequest, NextResponse } from "next/server";
import { createUser, validateRegisterInput } from "@/lib/users";
import type { RegisterInput } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterInput & { confirmPassword?: string };

    const input: RegisterInput = {
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      area: body.area,
      funcao: body.funcao,
      superiorEmail: body.superiorEmail,
    };

    const validationError = validateRegisterInput(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (body.password !== body.confirmPassword) {
      return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 });
    }

    const user = await createUser(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar conta.";
    const status = message.includes("já está cadastrado") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
