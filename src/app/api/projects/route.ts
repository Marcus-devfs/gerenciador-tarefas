import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getProjectsCollection, serializeProject } from "@/lib/mongodb";

function generateId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function now() {
  return new Date().toISOString().split("T")[0];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collection = await getProjectsCollection();

    const docs = await collection.find({ active: true }).sort({ name: 1 }).toArray();
    return NextResponse.json(docs.map(serializeProject));
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    const trimmed = (name ?? "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }

    const collection = await getProjectsCollection();
    const existing = await collection.findOne({ name: trimmed });
    if (existing) {
      return NextResponse.json(serializeProject(existing), { status: 200 });
    }

    const id = generateId();
    const today = now();
    const doc = {
      _id: id,
      name: trimmed,
      active: true,
      createdByUserId: new ObjectId(session.user.id),
      createdAt: today,
      updatedAt: today,
    };
    await collection.insertOne(doc as any);

    return NextResponse.json(serializeProject(doc), { status: 201 });
  } catch (err) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
