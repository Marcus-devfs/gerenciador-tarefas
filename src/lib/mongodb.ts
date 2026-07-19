import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import type { Task } from "@/types";
import type { Note } from "@/types/note";
import type { Project, UserSettings } from "@/types/project";
import { toObjectId } from "@/lib/objectId";

const uri = process.env.MONGODB_URI!;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

async function getClient(): Promise<MongoClient> {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri);
    await global._mongoClient.connect();
  }
  return global._mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

export async function getTasksCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection("tasks");
}

function toIdString(value: ObjectId | string): string {
  return value instanceof ObjectId ? value.toHexString() : String(value);
}

/** Resolve task lookup by ObjectId hex. */
export function taskByIdFilter(id: string): { _id: ObjectId } | null {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  return { _id: objectId };
}

export function newTaskObjectId(): ObjectId {
  return new ObjectId();
}

export function serializeTask(doc: any): Task {
  const { _id, id: _docId, assignedUserId, assignedTo, ...rest } = doc;
  const userId = assignedUserId
    ? toIdString(assignedUserId)
    : assignedTo
      ? String(assignedTo)
      : "";
  return {
    ...rest,
    id: toIdString(_id),
    assignedUserId: userId,
  } as Task;
}

export async function getNotasCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection("notas");
}

export async function getProjectsCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection("projects");
}

export async function getUserSettingsCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection("user_settings");
}

export function serializeProject(doc: any): Project {
  const { _id, createdByUserId, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    createdByUserId: createdByUserId ? toIdString(createdByUserId) : undefined,
  } as Project;
}

export function serializeUserSettings(doc: any): UserSettings {
  const { _id, userId, managerId: _managerId, email, ...rest } = doc;
  return {
    ...rest,
    userId: userId ? toIdString(userId) : toIdString(_id),
    email: email ?? "",
  } as UserSettings;
}

export function serializeNote(doc: any): Note {
  const { _id, userId, userEmail, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    userId: userId ? toIdString(userId) : userEmail ? String(userEmail) : "",
  } as Note;
}
