import { apiProcess, ok, validateWith, value } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import {
  marketplaceNotificationSubscribeInputSchema,
  type MarketplaceNotificationSubscribeInput
} from "@/nextsignal/schemas";

export type MarketplaceNotificationSubscribeOutput = {
  status: "subscribed" | "already_subscribed";
};

export const marketplaceNotificationSubscribeApi = apiProcess<
  MarketplaceNotificationSubscribeInput,
  MarketplaceNotificationSubscribeOutput,
  AppServices
>({
  name: "marketplaceNotifications.subscribe",
  metadata: {
    description: "Subscribes an email address to marketplace availability notifications.",
    tags: ["marketplace", "notifications", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: () => ok(),
  validate: validateWith(marketplaceNotificationSubscribeInputSchema),
  async handle(ctx, input) {
    const result = await ctx.services.marketplaceNotifications.subscribe(input.email);
    return value({ status: result.created ? "subscribed" : "already_subscribed" });
  }
});
