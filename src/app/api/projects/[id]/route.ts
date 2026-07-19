import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProjectsCollection, serializeProject } from "@/lib/mongodb";

type Params = { params: Promise<{ id: string }> };

function now() {
  return new Date().toISOString().split("T")[0];
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const collection = await getProjectsCollection();

    const existing = await collection.findOne({ _id: id as any });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: now() };
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.active !== undefined) updates.active = Boolean(body.active);

    await collection.updateOne({ _id: id as any }, { $set: updates });
    const refreshed = await collection.findOne({ _id: id as any });
    return NextResponse.json(serializeProject(refreshed));
  } catch (err) {
    console.error("[PUT /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const collection = await getProjectsCollection();

    await collection.updateOne({ _id: id as any }, { $set: { active: false, updatedAt: now() } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
