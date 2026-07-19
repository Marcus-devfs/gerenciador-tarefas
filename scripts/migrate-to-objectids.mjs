/**
 * Migra dados legados (email como _id/FK) para ObjectId com relacionamentos corretos.
 * Uso: node --env-file=.env.local scripts/migrate-to-objectids.mjs
 */
import { MongoClient, ObjectId } from "mongodb";

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error("MONGODB_URI não definida.");
  process.exit(1);
}

function isEmailId(value) {
  return typeof value === "string" && value.includes("@");
}

function emailToName(email) {
  return email
    .split("@")[0]
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const client = new MongoClient(URI);
await client.connect();
const db = client.db("andamento-tarefas");

const usersCol = db.collection("users");
const settingsCol = db.collection("user_settings");
const tasksCol = db.collection("tasks");
const notasCol = db.collection("notas");
const projectsCol = db.collection("projects");

const emailToUserId = new Map();
const now = new Date().toISOString();

console.log("1) Migrando users...");
const legacyUsers = await usersCol.find({}).toArray();
for (const doc of legacyUsers) {
  if (doc._id instanceof ObjectId && doc.email) {
    emailToUserId.set(doc.email.toLowerCase(), doc._id);
    continue;
  }

  if (isEmailId(doc._id)) {
    const email = String(doc._id).toLowerCase();
    const newId = new ObjectId();
    const newDoc = {
      _id: newId,
      email,
      name: doc.name ?? emailToName(email),
      passwordHash: doc.passwordHash,
      area: doc.area,
      funcao: doc.funcao,
      superiorId: doc.superiorEmail
        ? emailToUserId.get(doc.superiorEmail.toLowerCase()) ?? undefined
        : doc.superiorId,
      createdAt: doc.createdAt ?? now,
      updatedAt: now,
    };
    await usersCol.insertOne(newDoc);
    await usersCol.deleteOne({ _id: doc._id });
    emailToUserId.set(email, newId);
    console.log(`   user ${email} -> ${newId.toHexString()}`);
  }
}

// Re-resolve superiorId for users migrated in first pass
for (const doc of await usersCol.find({ superiorEmail: { $exists: true, $ne: null } }).toArray()) {
  const superiorId = emailToUserId.get(doc.superiorEmail?.toLowerCase());
  if (superiorId) {
    await usersCol.updateOne({ _id: doc._id }, { $set: { superiorId }, $unset: { superiorEmail: "" } });
  }
}

console.log("2) Migrando user_settings...");
const legacySettings = await settingsCol.find({}).toArray();
for (const doc of legacySettings) {
  if (doc.userId instanceof ObjectId && doc.email) continue;

  let userId;
  let email;

  if (isEmailId(doc._id)) {
    email = String(doc._id).toLowerCase();
    userId = emailToUserId.get(email);
    if (!userId) {
      userId = new ObjectId();
      await usersCol.insertOne({
        _id: userId,
        email,
        name: doc.name ?? emailToName(email),
        createdAt: now,
        updatedAt: now,
      });
      emailToUserId.set(email, userId);
    }
  } else if (doc.email) {
    email = doc.email.toLowerCase();
    userId = emailToUserId.get(email) ?? doc.userId;
  }

  if (!userId) continue;

  let managerEmail = doc.managerEmail?.toLowerCase();

  const newSettings = {
    _id: doc._id instanceof ObjectId ? doc._id : new ObjectId(),
    userId,
    email,
    name: doc.name ?? emailToName(email),
    managerEmail,
    managerName: doc.managerName,
    emailSignature: doc.emailSignature,
    emailSignatureImage: doc.emailSignatureImage,
    emailSignatureImageMime: doc.emailSignatureImageMime,
    createdAt: doc.createdAt ?? now,
    updatedAt: now,
  };

  if (!(doc._id instanceof ObjectId) || isEmailId(doc._id)) {
    await settingsCol.deleteOne({ _id: doc._id });
  }
  const { createdAt: _createdAt, ...settingsFields } = newSettings;
  await settingsCol.updateOne(
    { userId },
    {
      $set: settingsFields,
      $setOnInsert: { createdAt: doc.createdAt ?? now },
    },
    { upsert: true },
  );
}

console.log("3) Migrando tasks (assignedUserId)...");
const tasks = await tasksCol.find({}).toArray();
for (const task of tasks) {
  const updates = { updatedAt: now };
  const unsets = {};

  if (task.assignedTo && !task.assignedUserId) {
    const email = String(task.assignedTo).toLowerCase();
    let userId = emailToUserId.get(email);
    if (!userId) {
      userId = new ObjectId();
      await usersCol.insertOne({
        _id: userId,
        email,
        name: task.assignedToName ?? emailToName(email),
        createdAt: now,
        updatedAt: now,
      });
      emailToUserId.set(email, userId);
    }
    updates.assignedUserId = userId;
    unsets.assignedTo = "";
  }

  if (Object.keys(updates).length > 1 || Object.keys(unsets).length > 0) {
    await tasksCol.updateOne(
      { _id: task._id },
      {
        $set: updates,
        ...(Object.keys(unsets).length > 0 ? { $unset: unsets } : {}),
      },
    );
  }
}

console.log("4) Migrando tasks (_id -> ObjectId)...");
const taskIdMap = new Map();
const allTasks = await tasksCol.find({}).toArray();
for (const task of allTasks) {
  if (task._id instanceof ObjectId) {
    taskIdMap.set(task._id.toHexString(), task._id);
    if (task.id) taskIdMap.set(String(task.id), task._id);
    continue;
  }

  const oldId = String(task._id);
  const newId = new ObjectId();
  taskIdMap.set(oldId, newId);
  if (task.id) taskIdMap.set(String(task.id), newId);

  const { _id, id, ...rest } = task;
  await tasksCol.insertOne({ _id: newId, ...rest, updatedAt: now });
  await tasksCol.deleteOne({ _id: task._id });
  console.log(`   task ${oldId} -> ${newId.toHexString()}`);
}

await tasksCol.updateMany({ id: { $exists: true } }, { $unset: { id: "" } });

console.log("5) Atualizando notas.tarefaId...");
for (const nota of await notasCol.find({ tarefaId: { $exists: true, $ne: null } }).toArray()) {
  const mapped = taskIdMap.get(String(nota.tarefaId));
  if (mapped) {
    await notasCol.updateOne(
      { _id: nota._id },
      { $set: { tarefaId: mapped.toHexString() } },
    );
  }
}

console.log("6) Migrando notas (userId)...");
const notas = await notasCol.find({}).toArray();
for (const nota of notas) {
  if (nota.userId instanceof ObjectId) continue;
  const email = String(nota.userEmail ?? "").toLowerCase();
  if (!email) continue;

  let userId = emailToUserId.get(email);
  if (!userId) {
    userId = new ObjectId();
    await usersCol.insertOne({
      _id: userId,
      email,
      name: emailToName(email),
      createdAt: now,
      updatedAt: now,
    });
    emailToUserId.set(email, userId);
  }

  await notasCol.updateOne(
    { _id: nota._id },
    { $set: { userId }, $unset: { userEmail: "" } },
  );
}

console.log("7) Criando índices...");
await usersCol.createIndex({ email: 1 }, { unique: true });
await settingsCol.createIndex({ userId: 1 }, { unique: true });
await settingsCol.createIndex({ managerEmail: 1 });
await tasksCol.createIndex({ assignedUserId: 1 });
await notasCol.createIndex({ userId: 1 });

console.log("8) Removendo managerId legado...");
await settingsCol.updateMany({}, { $unset: { managerId: "" } });

await client.close();
console.log("\nMigração concluída.\n");
