import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getNotasCollection, serializeNote } from "@/lib/mongodb";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const now = new Date().toISOString().split("T")[0];

    const updates = {
      ...body,
      updatedAt: now,
    };

    const collection = await getNotasCollection();
    const result = await collection.findOneAndUpdate(
      { id, userId: new ObjectId(session.user.id) },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    }

    return NextResponse.json(serializeNote(result));
  } catch (err) {
    console.error("[PUT /api/notas/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const collection = await getNotasCollection();
    await collection.deleteOne({ id, userId: new ObjectId(session.user.id) });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/notas/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
