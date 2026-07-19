import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getNotasCollection, serializeNote } from "@/lib/mongodb";

function generateId() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collection = await getNotasCollection();
    const docs = await collection
      .find({ userId: new ObjectId(session.user.id) })
      .sort({ data: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json(docs.map(serializeNote));
  } catch (err) {
    console.error("[GET /api/notas]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = generateId();
    const now = new Date().toISOString().split("T")[0];

    const nota = {
      _id: id,
      id,
      userId: new ObjectId(session.user.id),
      titulo: body.titulo ?? "",
      conteudo: body.conteudo ?? "",
      tipo: body.tipo ?? "anotacao",
      tarefaId: body.tarefaId ?? undefined,
      tarefaTitulo: body.tarefaTitulo ?? undefined,
      data: body.data ?? now,
      createdAt: now,
      updatedAt: now,
    };

    const collection = await getNotasCollection();
    await collection.insertOne(nota as any);

    return NextResponse.json(serializeNote(nota), { status: 201 });
  } catch (err) {
    console.error("[POST /api/notas]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
