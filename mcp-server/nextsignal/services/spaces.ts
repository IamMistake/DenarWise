import { and, asc, eq, inArray } from "drizzle-orm";
import { homeShoppingItems, homeSpaceMembers, homeSpaces, homeTodos, homeUsers } from "@/nextsignal/db/schema";
import type { HomeSpace, HomeSpaceMember } from "@/nextsignal/domain/home";
import { getDb } from "@/nextsignal/services/database";

export type SpaceSummary = HomeSpace & {
  role: HomeSpaceMember["role"];
  memberCount: number;
  isActive: boolean;
};

export type SpaceDetails = SpaceSummary & {
  members: HomeSpaceMember[];
};

export type LeaveSpaceResult = {
  spaceId: string;
  remainingMemberCount: number;
  deletedSpace: boolean;
};

export const spacesService = {
  async create(input: { userId: string; name: string }): Promise<SpaceDetails> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const inviteCode = await createUniqueInviteCode();
    const name = input.name.trim();

    const [space] = await db
      .insert(homeSpaces)
      .values({
        id,
        name,
        inviteCode,
        createdByUserId: input.userId
      })
      .returning();

    await db.insert(homeSpaceMembers).values({
      spaceId: id,
      userId: input.userId,
      role: "owner"
    });

    return this.getDetails(input.userId, id);
  },

  async joinByCode(input: { userId: string; code: string }): Promise<SpaceDetails | null> {
    const db = await getDb();
    const code = normalizeInviteCode(input.code);
    const [space] = await db
      .select()
      .from(homeSpaces)
      .where(eq(homeSpaces.inviteCode, code))
      .limit(1);

    if (!space) return null;

    await db
      .insert(homeSpaceMembers)
      .values({
        spaceId: space.id,
        userId: input.userId,
        role: "member"
      })
      .onConflictDoNothing();

    return this.getDetails(input.userId, space.id);
  },

  async listForUser(userId: string): Promise<SpaceSummary[]> {
    const db = await getDb();
    const rows = await db
      .select({
        space: homeSpaces,
        member: homeSpaceMembers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeSpaces, eq(homeSpaces.id, homeSpaceMembers.spaceId))
      .where(eq(homeSpaceMembers.userId, userId))
      .orderBy(asc(homeSpaces.createdAt));

    if (rows.length === 0) return [];

    const memberCounts = await this.countMembers(rows.map((row) => row.space.id));
    return rows.map((row) => ({
      ...mapHomeSpace(row.space),
      role: row.member.role,
      memberCount: memberCounts.get(row.space.id) ?? 1,
      isActive: true
    }));
  },

  async getDetails(userId: string, spaceId: string): Promise<SpaceDetails> {
    const spaces = await this.listForUser(userId);
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      throw new Error("Space membership disappeared while loading details.");
    }

    return {
      ...space,
      members: await this.listMembers(spaceId)
    };
  },

  async listMembers(spaceId: string): Promise<HomeSpaceMember[]> {
    const db = await getDb();
    const rows = await db
      .select({
        member: homeSpaceMembers,
        user: homeUsers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeUsers, eq(homeUsers.id, homeSpaceMembers.userId))
      .where(eq(homeSpaceMembers.spaceId, spaceId))
      .orderBy(asc(homeSpaceMembers.joinedAt));

    return rows.map((row) => mapHomeSpaceMember(row.member, row.user));
  },

  async listNotificationMembers(input: { spaceId: string; excludeUserId: string }): Promise<HomeSpaceMember[]> {
    const members = await this.listMembers(input.spaceId);
    return members.filter((member) => member.userId !== input.excludeUserId && member.email);
  },

  async leave(input: { userId: string; spaceId: string }): Promise<LeaveSpaceResult> {
    const db = await getDb();

    return db.transaction(async (tx) => {
      await tx
        .delete(homeSpaceMembers)
        .where(and(eq(homeSpaceMembers.userId, input.userId), eq(homeSpaceMembers.spaceId, input.spaceId)));

      await tx
        .update(homeUsers)
        .set({ activeSpaceId: null, updatedAt: new Date() })
        .where(and(eq(homeUsers.id, input.userId), eq(homeUsers.activeSpaceId, input.spaceId)));

      const remainingMembers = await tx
        .select({ userId: homeSpaceMembers.userId, role: homeSpaceMembers.role })
        .from(homeSpaceMembers)
        .where(eq(homeSpaceMembers.spaceId, input.spaceId))
        .orderBy(asc(homeSpaceMembers.joinedAt));
      const remainingMemberCount = remainingMembers.length;

      if (remainingMemberCount > 0) {
        const hasOwner = remainingMembers.some((member) => member.role === "owner");
        if (!hasOwner) {
          await tx
            .update(homeSpaceMembers)
            .set({ role: "owner" })
            .where(and(
              eq(homeSpaceMembers.spaceId, input.spaceId),
              eq(homeSpaceMembers.userId, remainingMembers[0].userId)
            ));
        }

        return {
          spaceId: input.spaceId,
          remainingMemberCount,
          deletedSpace: false
        };
      }

      await tx.delete(homeShoppingItems).where(eq(homeShoppingItems.spaceId, input.spaceId));
      await tx.delete(homeTodos).where(eq(homeTodos.spaceId, input.spaceId));
      await tx
        .update(homeUsers)
        .set({ activeSpaceId: null, updatedAt: new Date() })
        .where(eq(homeUsers.activeSpaceId, input.spaceId));
      await tx.delete(homeSpaces).where(eq(homeSpaces.id, input.spaceId));

      return {
        spaceId: input.spaceId,
        remainingMemberCount,
        deletedSpace: true
      };
    });
  },

  async getMembership(userId: string, spaceId: string): Promise<HomeSpaceMember | null> {
    const db = await getDb();
    const [row] = await db
      .select({
        member: homeSpaceMembers,
        user: homeUsers
      })
      .from(homeSpaceMembers)
      .innerJoin(homeUsers, eq(homeUsers.id, homeSpaceMembers.userId))
      .where(and(eq(homeSpaceMembers.userId, userId), eq(homeSpaceMembers.spaceId, spaceId)))
      .limit(1);

    return row ? mapHomeSpaceMember(row.member, row.user) : null;
  },

  async countMembers(spaceIds: string[]): Promise<Map<string, number>> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(homeSpaceMembers)
      .where(inArray(homeSpaceMembers.spaceId, spaceIds));
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.spaceId, (counts.get(row.spaceId) ?? 0) + 1);
    }

    return counts;
  }
};

async function createUniqueInviteCode() {
  const db = await getDb();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const [existing] = await db
      .select({ id: homeSpaces.id })
      .from(homeSpaces)
      .where(eq(homeSpaces.inviteCode, code))
      .limit(1);

    if (!existing) return code;
  }

  throw new Error("Unable to generate a unique space invite code.");
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replaceAll("-", "").replaceAll(" ", "");
}

function mapHomeSpace(row: typeof homeSpaces.$inferSelect): HomeSpace {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.inviteCode,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString()
  };
}

function mapHomeSpaceMember(
  member: typeof homeSpaceMembers.$inferSelect,
  user: typeof homeUsers.$inferSelect
): HomeSpaceMember {
  return {
    spaceId: member.spaceId,
    userId: member.userId,
    role: member.role,
    email: user.email,
    displayName: user.displayName,
    joinedAt: member.joinedAt.toISOString()
  };
}
