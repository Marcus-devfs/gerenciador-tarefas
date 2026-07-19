/**
 * Cria ou redefine a senha da conta admin inicial.
 * Uso: node --env-file=.env.local scripts/seed-admin.mjs
 */
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "marcus.silva@gruporoncador.com.br";
const NAME = process.env.SEED_ADMIN_NAME ?? "Marcus Silva";
const URI = process.env.MONGODB_URI;

if (!URI) {
  console.error("MONGODB_URI não definida. Use: node --env-file=.env.local scripts/seed-admin.mjs");
  process.exit(1);
}

const password = crypto.randomBytes(9).toString("base64url");
const hash = await bcrypt.hash(password, 12);
const now = new Date().toISOString();

const client = new MongoClient(URI);
await client.connect();
const db = client.db("andamento-tarefas");
const usersCol = db.collection("users");
const settingsCol = db.collection("user_settings");

const normalizedEmail = EMAIL.toLowerCase();
let user = await usersCol.findOne({ email: normalizedEmail });
let userId;

if (user) {
  userId = user._id;
  await usersCol.updateOne(
    { _id: userId },
    {
      $set: {
        name: NAME,
        passwordHash: hash,
        updatedAt: now,
      },
    },
  );
} else {
  userId = new ObjectId();
  await usersCol.insertOne({
    _id: userId,
    email: normalizedEmail,
    name: NAME,
    passwordHash: hash,
    createdAt: now,
    updatedAt: now,
  });
}

await settingsCol.updateOne(
  { userId },
  {
    $set: {
      userId,
      email: normalizedEmail,
      name: NAME,
      updatedAt: now,
    },
    $setOnInsert: {
      _id: new ObjectId(),
      createdAt: now,
    },
  },
  { upsert: true },
);

await usersCol.createIndex({ email: 1 }, { unique: true });
await settingsCol.createIndex({ userId: 1 }, { unique: true });

await client.close();

console.log("\nConta criada/atualizada com sucesso.\n");
console.log(`E-mail: ${normalizedEmail}`);
console.log(`UserId: ${userId.toHexString()}`);
console.log(`Senha:  ${password}`);
console.log("\nGuarde esta senha — ela não será exibida novamente.\n");
