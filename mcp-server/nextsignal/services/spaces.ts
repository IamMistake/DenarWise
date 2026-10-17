import { and, asc, count, eq, inArray } from "drizzle-orm";
import { homeShoppingItems, spaceMembersTable, spacesTable, homeTodos, homeUsers } from "@/nextsignal/db/schema";
import type { Space, SpaceMember, ShoppingItem } from "@/nextsignal/domain/home";
import { getDb } from "@/nextsignal/services/database";
import { mapShoppingItem } from "@/nextsignal/services/shopping";

export type SpaceSummary = Space & {
  role: SpaceMember["role"];
  memberCount: number;
  isActive: boolean;
};

export type SpaceDetails = SpaceSummary & {
  members: SpaceMember[];
};

export type SpaceDashboard = SpaceDetails & {
  items: ShoppingItem[];
};

export type LeaveSpaceResult = {
  spaceId: string;
  remainingMemberCount: number;
  deletedSpace: boolean;
};

export function createSpacesService(database = getDb) { return {
  async create(input: { userId: string; name: string }): Promise<SpaceDetails> {
    const db = await database();
    const id = crypto.randomUUID();
    const inviteCode = await createUniqueInviteCode(database);
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
    const db = await database();
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
    const db = await database();
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

  async listDashboard(userId: string): Promise<SpaceDashboard[]> {
    // Only IDs selected through this user's memberships may reach these reads.
    // The dashboard needs stored items, never a catalog/AI price refresh.
    const spaces = await this.listForUser(userId);
    if (!spaces.length) return [];
    const db = await database();
    const spaceIds = spaces.map((space) => space.id);
    const [memberRows, itemRows] = await Promise.all([
      db.select({ member: spaceMembersTable, user: homeUsers })
        .from(spaceMembersTable)
        .innerJoin(homeUsers, eq(homeUsers.id, spaceMembersTable.userId))
        .where(inArray(spaceMembersTable.spaceId, spaceIds))
        .orderBy(asc(spaceMembersTable.joinedAt)),
      db.select().from(homeShoppingItems)
        .where(inArray(homeShoppingItems.spaceId, spaceIds))
        .orderBy(asc(homeShoppingItems.createdAt))
    ]);
    const members = new Map<string, SpaceMember[]>();
    const items = new Map<string, ShoppingItem[]>();
    for (const row of memberRows) {
      const group = members.get(row.member.spaceId) ?? [];
      group.push(mapSpaceMember(row.member, row.user));
      members.set(row.member.spaceId, group);
    }
    for (const row of itemRows) {
      const group = items.get(row.spaceId) ?? [];
      group.push(mapShoppingItem(row));
      items.set(row.spaceId, group);
    }
    return spaces.map((space) => ({ ...space, members: members.get(space.id) ?? [], items: items.get(space.id) ?? [] }));
  },

  async getDetails(userId: string, spaceId: string): Promise<SpaceDetails> {
    const db = await database();
    const [row] = await db.select({ space: spacesTable, member: spaceMembersTable })
      .from(spaceMembersTable)
      .innerJoin(spacesTable, eq(spacesTable.id, spaceMembersTable.spaceId))
      .where(and(eq(spaceMembersTable.userId, userId), eq(spaceMembersTable.spaceId, spaceId)))
      .limit(1);
    if (!row) {
      throw new Error("Space membership disappeared while loading details.");
    }

    const members = await this.listMembers(spaceId);
    return {
      ...mapSpace(row.space),
      role: row.member.role,
      memberCount: members.length,
      isActive: true,
      members
    };
  },

  async listMembers(spaceId: string): Promise<SpaceMember[]> {
    const db = await database();
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
    const db = await database();

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
    const db = await database();
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
    if (!spaceIds.length) return new Map();
    const db = await database();
    const rows = await db
      .select({ spaceId: spaceMembersTable.spaceId, memberCount: count() })
      .from(spaceMembersTable)
      .where(inArray(spaceMembersTable.spaceId, spaceIds))
      .groupBy(spaceMembersTable.spaceId);
    return new Map(rows.map((row) => [row.spaceId, row.memberCount]));
  }
}; }

export const spacesService = createSpacesService();

async function createUniqueInviteCode(database: typeof getDb) {
  const db = await database();

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
