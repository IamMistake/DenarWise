import type { MatchResult, Recommendation } from "@/nextsignal/catalog/types";

export type SpaceMemberRole = "owner" | "member";

export type HomeUser = {
  id: string;
  email: string;
  displayName: string;
  activeSpaceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Space = {
  id: string;
  name: string;
  inviteCode: string;
  createdByUserId: string;
  createdAt: string;
};

export type SpaceMember = {
  spaceId: string;
  userId: string;
  role: SpaceMemberRole;
  email: string;
  displayName: string;
  joinedAt: string;
};

export type ActiveSpace = {
  user: HomeUser;
  space: Space;
  membership: SpaceMember;
};

export type ShoppingItem = {
  id: string;
  spaceId: string;
  name: string;
  quantity: string;
  store: string | null;
  createdAt: string;
  productId?: string | null;
  originalQuery?: string;
  keywords?: string[];
  requestedStore?: string | null;
  matching?: MatchResult;
  recommendation?: Recommendation;
};

export type TodoItem = {
  id: string;
  spaceId: string;
  title: string;
  assigneeUserId: string;
  assigneeDisplayName: string;
  completedAt: string | null;
  createdAt: string;
};

export type HomeChangeNotification = {
  domain: "shopping" | "todos";
  action: string;
  spaceName: string;
  changedBy: string;
  summary: string;
  details: string[];
  snapshot: {
    shoppingItems?: ShoppingItem[];
    todos?: TodoItem[];
  };
  changedAt: string;
};
