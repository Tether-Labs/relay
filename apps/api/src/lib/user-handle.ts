import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { users, type User } from "../db/schema.js";

export function emailToHandle(email: string): string {
  const at = email.indexOf("@");
  return (at === -1 ? email : email.slice(0, at)).toLowerCase();
}

export async function findUserByParam(param: string): Promise<User | null> {
  const db = getDb();
  const decoded = decodeURIComponent(param).trim();
  if (!decoded) return null;

  if (decoded.startsWith("user_")) {
    const [row] = await db.select().from(users).where(eq(users.id, decoded)).limit(1);
    return row ?? null;
  }

  const handle = decoded.toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(substr(${users.email}, 1, instr(${users.email}, '@') - 1)) = ${handle}`);

  if (rows.length !== 1) return null;
  return rows[0] ?? null;
}
