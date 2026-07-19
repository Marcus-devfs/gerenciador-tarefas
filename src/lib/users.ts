import { ObjectId, type Collection } from "mongodb";
import { getDb, getUserSettingsCollection } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { PublicUser, RegisterInput, UserListItem } from "@/types/user";

interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash?: string;
  area?: string;
  funcao?: string;
  createdAt: string;
  updatedAt: string;
}

export function toUserIdString(id: ObjectId | string): string {
  return id instanceof ObjectId ? id.toHexString() : id;
}

export function emailToName(email: string): string {
  return email
    .split("@")[0]
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

function toPublicUser(doc: UserDocument): PublicUser {
  return {
    id: toUserIdString(doc._id),
    email: doc.email,
    name: doc.name,
    area: doc.area,
    funcao: doc.funcao,
  };
}

export function validateRegisterInput(input: RegisterInput): string | null {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";

  if (!name || name.length < 2) return "Informe seu nome completo.";
  if (!email || !email.includes("@")) return "Informe um e-mail válido.";
  if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";

  const superior = input.superiorEmail?.trim().toLowerCase();
  if (superior && (!superior.includes("@") || superior === email)) {
    return "Informe um e-mail válido para o superior.";
  }

  return null;
}

export async function findUserByEmail(
  email: string,
): Promise<(PublicUser & { passwordHash?: string }) | null> {
  const collection = await getUsersCollection();
  const doc = await collection.findOne({ email: email.trim().toLowerCase() });
  if (!doc) return null;
  return { ...toPublicUser(doc), passwordHash: doc.passwordHash };
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await getUsersCollection();
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return toPublicUser(doc);
}

export async function listUsers(): Promise<UserListItem[]> {
  const collection = await getUsersCollection();
  const docs = await collection.find({}).sort({ name: 1 }).toArray();
  return docs.map((doc) => ({
    id: toUserIdString(doc._id),
    email: doc.email,
    name: doc.name,
  }));
}

export async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  return user?.id ?? null;
}

async function createUserSettings(
  userId: ObjectId,
  email: string,
  name: string,
  managerEmail?: string,
  managerName?: string,
) {
  const settingsCol = await getUserSettingsCollection();
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = {
    userId,
    email,
    name,
    updatedAt: now,
  };

  if (managerEmail) {
    $set.managerEmail = managerEmail.toLowerCase();
    $set.managerName = managerName ?? emailToName(managerEmail);
  }

  await settingsCol.updateOne(
    { userId },
    {
      $set,
      $unset: { managerId: "" },
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function findOrCreateUserByEmail(
  email: string,
  name?: string,
): Promise<PublicUser> {
  const normalized = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalized);
  if (existing) return existing;

  const now = new Date().toISOString();
  const userId = new ObjectId();
  const displayName = name?.trim() || emailToName(normalized);

  const collection = await getUsersCollection();
  const doc: UserDocument = {
    _id: userId,
    email: normalized,
    name: displayName,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(doc);
  await createUserSettings(userId, normalized, displayName);

  return toPublicUser(doc);
}

export async function createUser(input: RegisterInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const area = input.area?.trim() || undefined;
  const funcao = input.funcao?.trim() || undefined;
  const superiorEmail = input.superiorEmail?.trim().toLowerCase() || undefined;
  const now = new Date().toISOString();

  const collection = await getUsersCollection();
  const existing = await collection.findOne({ email });
  if (existing) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  const userId = new ObjectId();
  const passwordHash = await hashPassword(input.password);
  const doc: UserDocument = {
    _id: userId,
    email,
    name,
    passwordHash,
    area,
    funcao,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(doc);
  await createUserSettings(
    userId,
    email,
    name,
    superiorEmail,
    superiorEmail ? emailToName(superiorEmail) : undefined,
  );

  return toPublicUser(doc);
}

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

export async function ensureUserSettings(userId: string, email: string, name: string) {
  const settingsCol = await getUserSettingsCollection();
  const userObjectId = new ObjectId(userId);
  const now = new Date().toISOString();

  await settingsCol.updateOne(
    { userId: userObjectId },
    {
      $set: {
        email: email.toLowerCase(),
        name,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        userId: userObjectId,
        createdAt: now,
      },
      $unset: { managerId: "" },
    },
    { upsert: true },
  );
}

export async function userHasPassword(userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const collection = await getUsersCollection();
  const doc = await collection.findOne(
    { _id: new ObjectId(userId) },
    { projection: { passwordHash: 1 } },
  );
  return Boolean(doc?.passwordHash);
}

export async function changePassword(
  userId: string,
  newPassword: string,
): Promise<string | null> {
  if (newPassword.length < 8) return "A nova senha deve ter no mínimo 8 caracteres.";

  const collection = await getUsersCollection();
  const doc = await collection.findOne({ _id: new ObjectId(userId) });
  if (!doc?.passwordHash) {
    return "Esta conta não possui senha local para alterar.";
  }

  await collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        updatedAt: new Date().toISOString(),
      },
    },
  );

  return null;
}
