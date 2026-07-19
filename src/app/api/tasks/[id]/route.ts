import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getTasksCollection, serializeTask, taskByIdFilter } from "@/lib/mongodb";
import { isTeamLeader } from "@/lib/authScope";
import { findUserById } from "@/lib/users";

type Params = { params: Promise<{ id: string }> };

function now() {
  return new Date().toISOString().split("T")[0];
}

function getAssignedUserId(doc: { assignedUserId?: ObjectId | string; assignedTo?: string }): string {
  if (doc.assignedUserId) {
    return doc.assignedUserId instanceof ObjectId
      ? doc.assignedUserId.toHexString()
      : String(doc.assignedUserId);
  }
  return String(doc.assignedTo ?? "");
}

async function assertCanModifyTask(
  sessionUserId: string,
  sessionEmail: string,
  isAdmin: boolean,
  assignedUserId: string,
) {
  if (isAdmin) return null;
  if (await isTeamLeader(sessionEmail)) {
    return NextResponse.json({ error: "Líderes podem apenas visualizar tarefas da equipe" }, { status: 403 });
  }
  if (assignedUserId !== sessionUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const collection = await getTasksCollection();
    const filter = taskByIdFilter(id);
    if (!filter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin = session.user.isAdmin ?? false;
    const denied = await assertCanModifyTask(
      session.user.id,
      session.user.email,
      isAdmin,
      getAssignedUserId(existing as { assignedUserId?: ObjectId | string; assignedTo?: string }),
    );
    if (denied) return denied;

    const {
      id: _bodyId,
      _id: _bodyMongoId,
      createdAt,
      assignedUserId: bodyAssignedUserId,
      assignedToName,
      ...updates
    } = body;
    const updatedDoc: Record<string, unknown> = { ...updates, updatedAt: now() };

    if (isAdmin && bodyAssignedUserId) {
      updatedDoc.assignedUserId = new ObjectId(bodyAssignedUserId);
      if (assignedToName) {
        updatedDoc.assignedToName = assignedToName;
      } else {
        const user = await findUserById(bodyAssignedUserId);
        if (user) updatedDoc.assignedToName = user.name;
      }
    }

    await collection.updateOne(filter, { $set: updatedDoc });

    const refreshed = await collection.findOne(filter);
    return NextResponse.json(serializeTask(refreshed));
  } catch (err) {
    console.error("[PUT /api/tasks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const collection = await getTasksCollection();
    const filter = taskByIdFilter(id);
    if (!filter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin = session.user.isAdmin ?? false;
    const denied = await assertCanModifyTask(
      session.user.id,
      session.user.email,
      isAdmin,
      getAssignedUserId(existing as { assignedUserId?: ObjectId | string; assignedTo?: string }),
    );
    if (denied) return denied;

    await collection.deleteOne(filter);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tasks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
