import { v4 as uuidv4 } from "uuid";

export async function getOrCreateUserMagicToken(userId: string): Promise<string> {
  if (!userId) return "";
  return uuidv4().replace(/-/g, '');
}
