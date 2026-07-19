import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getTasksCollection, newTaskObjectId, serializeTask } from "@/lib/mongodb";
import { getTaskVisibilityQuery, isTeamLeader } from "@/lib/authScope";

function now() {
  return new Date().toISOString().split("T")[0];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.isAdmin ?? false;
    const collection = await getTasksCollection();

    const query = await getTaskVisibilityQuery(session.user.id, session.user.email, isAdmin);
    const docs = await collection.find(query).sort({ updatedAt: -1 }).toArray();

    return NextResponse.json(docs.map(serializeTask));
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.isAdmin ?? false;
    const collection = await getTasksCollection();

    const leader = await isTeamLeader(session.user.email);
    if (leader && !isAdmin) {
      return NextResponse.json({ error: "Líderes não podem criar tarefas pela visão de equipe" }, { status: 403 });
    }

    const body = await req.json();
    const taskId = newTaskObjectId();
    const today = now();

    let assignedUserId = session.user.id;
    let assignedToName = session.user.name || session.user.email;

    if (isAdmin && body.assignedUserId) {
      assignedUserId = body.assignedUserId;
      assignedToName = body.assignedToName || assignedToName;
    }

    const { id: _id, assignedTo: _assignedTo, ...fields } = body;
    const task = {
      _id: taskId,
      ...fields,
      assignedUserId: new ObjectId(assignedUserId),
      assignedToName,
      createdAt: today,
      updatedAt: today,
    };

    await collection.insertOne(task as any);

    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
