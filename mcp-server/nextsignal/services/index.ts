import { emailService } from "@/nextsignal/services/email";
import { logsService } from "@/nextsignal/services/logs";
import { marketplaceNotificationsService } from "@/nextsignal/services/marketplace-notifications";
import { shoppingService } from "@/nextsignal/services/shopping";
import { spacesService } from "@/nextsignal/services/spaces";
import { todosService } from "@/nextsignal/services/todos";
import { usersService } from "@/nextsignal/services/users";
import { workosService } from "@/nextsignal/services/workos";

export type HealthSnapshot = {
  status: "ok";
  appName: string;
  checkedAt: string;
};

// Services are the app-owned data and integration layer.
//
// Put database repositories, ORM clients, API clients, mailers, and other
// infrastructure here. NextSignal should not know or care whether you use
// Drizzle, Prisma, raw SQL, Redis, S3, or anything else.
export const services = {
  health: {
    async check(appName: string): Promise<HealthSnapshot> {
      return {
        status: "ok",
        appName,
        checkedAt: new Date().toISOString()
      };
    }
  },
  shopping: shoppingService,
  spaces: spacesService,
  todos: todosService,
  users: usersService,
  workos: workosService,
  email: emailService,
  logs: logsService,
  marketplaceNotifications: marketplaceNotificationsService
};

export type AppServices = typeof services;
