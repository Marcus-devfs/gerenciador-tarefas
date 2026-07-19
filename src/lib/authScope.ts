import { ObjectId } from "mongodb";
import { getUserSettingsCollection } from "@/lib/mongodb";

export async function getSubordinateUserIds(managerEmail: string): Promise<string[]> {
  const collection = await getUserSettingsCollection();
  const normalized = managerEmail.trim().toLowerCase();
  const docs = await collection
    .find({ managerEmail: normalized, email: { $ne: normalized } })
    .toArray();

  return docs.map((d) => (d.userId as ObjectId).toHexString());
}

export async function getTaskVisibilityQuery(
  userId: string,
  managerEmail: string,
  isAdmin: boolean,
) {
  if (isAdmin) return {};

  const subordinates = await getSubordinateUserIds(managerEmail);

  if (subordinates.length > 0) {
    return { assignedUserId: { $in: subordinates.map((id) => new ObjectId(id)) } };
  }

  return { assignedUserId: new ObjectId(userId) };
}

export async function isTeamLeader(managerEmail: string): Promise<boolean> {
  const subordinates = await getSubordinateUserIds(managerEmail);
  return subordinates.length > 0;
}
