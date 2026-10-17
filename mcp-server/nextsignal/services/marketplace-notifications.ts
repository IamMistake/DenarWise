import { marketplaceNotificationSignups } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";

export type MarketplaceNotificationSubscribeResult = {
  created: boolean;
};

export const marketplaceNotificationsService = {
  async subscribe(email: string): Promise<MarketplaceNotificationSubscribeResult> {
    const db = await getDb();
    const [inserted] = await db
      .insert(marketplaceNotificationSignups)
      .values({
        id: crypto.randomUUID(),
        email: email.trim().toLowerCase()
      })
      .onConflictDoNothing({ target: marketplaceNotificationSignups.email })
      .returning({ id: marketplaceNotificationSignups.id });

    return { created: Boolean(inserted) };
  }
};
