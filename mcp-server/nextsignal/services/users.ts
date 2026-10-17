import { eq } from "drizzle-orm";
import { homeUsers } from "@/nextsignal/db/schema";
import type { HomeUser } from "@/nextsignal/domain/home";
import { getDb } from "@/nextsignal/services/database";
import { workosService } from "@/nextsignal/services/workos";

export type EnsureHomeUserInput = {
  workosUserId: string;
};

export const usersService = {
  async get(userId: string): Promise<HomeUser | null> {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(homeUsers)
      .where(eq(homeUsers.id, userId))
      .limit(1);

    return row ? mapHomeUser(row) : null;
  },

  async ensureFromWorkOS(input: EnsureHomeUserInput): Promise<HomeUser> {
    const existing = await this.get(input.workosUserId);
    if (existing) return existing;

    const profile = await workosService.getUserProfile(input.workosUserId);
    const db = await getDb();
    const [row] = await db
      .insert(homeUsers)
      .values({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName
      })
      .onConflictDoUpdate({
        target: homeUsers.id,
        set: {
          email: profile.email,
          displayName: profile.displayName,
          updatedAt: new Date()
        }
      })
      .returning();

    return mapHomeUser(row);
  }
};

function mapHomeUser(row: typeof homeUsers.$inferSelect): HomeUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    activeSpaceId: row.activeSpaceId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
