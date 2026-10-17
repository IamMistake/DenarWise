import { and, asc, eq, inArray } from "drizzle-orm";
import { homeShoppingItems, spaceMembersTable, spacesTable, homeTodos, homeUsers } from "@/nextsignal/db/schema";
import type { Space, SpaceMember } from "@/nextsignal/domain/home";
import { getDb } from "@/nextsignal/services/database";

export type SpaceSummary = Space & {
  role: SpaceMember["role"];
  memberCount: number;
  isActive: boolean;
};

export type SpaceDetails = SpaceSummary & {
  members: SpaceMember[];
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
      .insert(spacesTable)
      .values({
        id,
        name,
        inviteCode,
        createdByUserId: input.userId
      })
      .returning();

    await db.insert(spaceMembersTable).values({
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
      .from(spacesTable)
      .where(eq(spacesTable.inviteCode, code))
      .limit(1);

    if (!space) return null;

    await db
      .insert(spaceMembersTable)
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
        space: spacesTable,
        member: spaceMembersTable
      })
      .from(spaceMembersTable)
      .innerJoin(spacesTable, eq(spacesTable.id, spaceMembersTable.spaceId))
      .where(eq(spaceMembersTable.userId, userId))
      .orderBy(asc(spacesTable.createdAt));

    if (rows.length === 0) return [];

    const memberCounts = await this.countMembers(rows.map((row) => row.space.id));
    return rows.map((row) => ({
      ...mapSpace(row.space),
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

  async listMembers(spaceId: string): Promise<SpaceMember[]> {
    const db = await getDb();
    const rows = await db
      .select({
        member: spaceMembersTable,
        user: homeUsers
      })
      .from(spaceMembersTable)
      .innerJoin(homeUsers, eq(homeUsers.id, spaceMembersTable.userId))
      .where(eq(spaceMembersTable.spaceId, spaceId))
      .orderBy(asc(spaceMembersTable.joinedAt));

    return rows.map((row) => mapSpaceMember(row.member, row.user));
  },

  async listNotificationMembers(input: { spaceId: string; excludeUserId: string }): Promise<SpaceMember[]> {
    const members = await this.listMembers(input.spaceId);
    return members.filter((member) => member.userId !== input.excludeUserId && member.email);
  },

  async leave(input: { userId: string; spaceId: string }): Promise<LeaveSpaceResult> {
    const db = await getDb();

    return db.transaction(async (tx) => {
      await tx
        .delete(spaceMembersTable)
        .where(and(eq(spaceMembersTable.userId, input.userId), eq(spaceMembersTable.spaceId, input.spaceId)));

      await tx
        .update(homeUsers)
        .set({ activeSpaceId: null, updatedAt: new Date() })
        .where(and(eq(homeUsers.id, input.userId), eq(homeUsers.activeSpaceId, input.spaceId)));

      const remainingMembers = await tx
        .select({ userId: spaceMembersTable.userId, role: spaceMembersTable.role })
        .from(spaceMembersTable)
        .where(eq(spaceMembersTable.spaceId, input.spaceId))
        .orderBy(asc(spaceMembersTable.joinedAt));
      const remainingMemberCount = remainingMembers.length;

      if (remainingMemberCount > 0) {
        const hasOwner = remainingMembers.some((member) => member.role === "owner");
        if (!hasOwner) {
          await tx
            .update(spaceMembersTable)
            .set({ role: "owner" })
            .where(and(
              eq(spaceMembersTable.spaceId, input.spaceId),
              eq(spaceMembersTable.userId, remainingMembers[0].userId)
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
      await tx.delete(spacesTable).where(eq(spacesTable.id, input.spaceId));

      return {
        spaceId: input.spaceId,
        remainingMemberCount,
        deletedSpace: true
      };
    });
  },

  async getMembership(userId: string, spaceId: string): Promise<SpaceMember | null> {
    const db = await getDb();
    const [row] = await db
      .select({
        member: spaceMembersTable,
        user: homeUsers
      })
      .from(spaceMembersTable)
      .innerJoin(homeUsers, eq(homeUsers.id, spaceMembersTable.userId))
      .where(and(eq(spaceMembersTable.userId, userId), eq(spaceMembersTable.spaceId, spaceId)))
      .limit(1);

    return row ? mapSpaceMember(row.member, row.user) : null;
  },

  async countMembers(spaceIds: string[]): Promise<Map<string, number>> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(spaceMembersTable)
      .where(inArray(spaceMembersTable.spaceId, spaceIds));
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
      .select({ id: spacesTable.id })
      .from(spacesTable)
      .where(eq(spacesTable.inviteCode, code))
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

function mapSpace(row: typeof spacesTable.$inferSelect): Space {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.inviteCode,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString()
  };
}

function mapSpaceMember(
  member: typeof spaceMembersTable.$inferSelect,
  user: typeof homeUsers.$inferSelect
): SpaceMember {
  return {
    spaceId: member.spaceId,
    userId: member.userId,
    role: member.role,
    email: user.email,
    displayName: user.displayName,
    joinedAt: member.joinedAt.toISOString()
  };
}
