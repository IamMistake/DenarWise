import { healthApi } from "@/nextsignal/processes/api/health";
import { pruneLogsApi } from "@/nextsignal/processes/api/logs/prune";
import { marketplaceNotificationSubscribeApi } from "@/nextsignal/processes/api/marketplace-notifications/subscribe";
import { shoppingListItemsApi } from "@/nextsignal/processes/api/shopping/list-items";
import { shoppingPreviewAddApi } from "@/nextsignal/processes/api/shopping/preview-add";
import { spacesListMembersApi } from "@/nextsignal/processes/api/spaces/list-members";
import { todoListApi } from "@/nextsignal/processes/api/todos/list";
import { healthBusiness } from "@/nextsignal/processes/business/health";
import { shoppingAddItem } from "@/nextsignal/processes/business/shopping/add-item";
import { shoppingClearItems } from "@/nextsignal/processes/business/shopping/clear-items";
import { shoppingUpdateItems } from "@/nextsignal/processes/business/shopping/update-items";
import { spacesCreate } from "@/nextsignal/processes/business/spaces/create";
import { spacesJoin } from "@/nextsignal/processes/business/spaces/join";
import { spacesLeave } from "@/nextsignal/processes/business/spaces/leave";
import { spacesList } from "@/nextsignal/processes/business/spaces/list";
import { todoAdd } from "@/nextsignal/processes/business/todos/add";
import { todoComplete } from "@/nextsignal/processes/business/todos/complete";
import { ensureCurrentUser } from "@/nextsignal/processes/business/users/ensure-current";

// Register every process here. Process names must be unique.
//
// Suggested folders:
// - api: route-facing processes
// - business: reusable application logic
// - distributed: queue-backed work
// - recurring: scheduled work
export const processes = [
  healthApi,
  pruneLogsApi,
  marketplaceNotificationSubscribeApi,
  shoppingListItemsApi,
  shoppingPreviewAddApi,
  spacesListMembersApi,
  todoListApi,
  healthBusiness,
  ensureCurrentUser,
  spacesList,
  spacesCreate,
  spacesJoin,
  spacesLeave,
  shoppingAddItem,
  shoppingClearItems,
  shoppingUpdateItems,
  todoAdd,
  todoComplete
];
