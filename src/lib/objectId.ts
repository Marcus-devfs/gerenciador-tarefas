import { ObjectId } from "mongodb";

export function isObjectIdString(value: string | undefined | null): value is string {
  if (!value || value.includes("@")) return false;
  if (!ObjectId.isValid(value)) return false;
  return new ObjectId(value).toHexString() === value;
}

export function toObjectId(value: string): ObjectId | null {
  return isObjectIdString(value) ? new ObjectId(value) : null;
}
