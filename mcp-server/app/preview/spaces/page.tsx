import { notFound, redirect } from "next/navigation";
import { SpacesView, type SpaceCardView } from "@/app/spaces/spaces-view";

// Design preview of /spaces with SAMPLE data, because the real page needs WorkOS and a database.
// Only available while developing. Actions never touch real data.

type PreviewProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const now = "2026-10-17T09:00:00.000Z";

function member(spaceId: string, userId: string, displayName: string, role: "owner" | "member") {
  return { spaceId, userId, role, email: `${displayName.split(" ")[0].toLowerCase()}@example.com`, displayName, joinedAt: now };
}

const sampleSpaces: SpaceCardView[] = [
  {
    id: "3f6c1c1e-8a1b-4d0e-9f3a-7b1d2e5c9a10",
    name: "Filipovski",
    inviteCode: "K7M2QX9P",
    createdByUserId: "u1",
    createdAt: now,
    role: "owner",
    memberCount: 3,
    isActive: true,
    members: [member("s1", "u1", "Stefan Lazarevski", "owner"), member("s1", "u2", "Ana Filipovska", "member"), member("s1", "u3", "Marko Filipovski", "member")],
    items: [
      { id: "i1", spaceId: "s1", name: "Mleko 3.2% bitolsko plavo", quantity: "2", store: null, createdAt: now },
      { id: "i2", spaceId: "s1", name: "Zito leb proteinski 500g", quantity: "1", store: "Zito", createdAt: now },
      { id: "i3", spaceId: "s1", name: "Jogurt 1l", quantity: "3", store: "Kam", createdAt: now },
      { id: "i4", spaceId: "s1", name: "Banani", quantity: "7", store: null, createdAt: now },
      { id: "i5", spaceId: "s1", name: "Makaroni", quantity: "2", store: null, createdAt: now }
    ]
  },
  {
    id: "9b2e4d70-1c3f-4a6b-8e2d-0f5a7c1b3d42",
    name: "Dracevo",
    inviteCode: "D4R2C3V0",
    createdByUserId: "u1",
    createdAt: now,
    role: "member",
    memberCount: 7,
    isActive: false,
    members: ["Stefan Lazarevski", "Ivana Petrovska", "Goran Trajkovski", "Elena Ristova", "Nikola Stojanov", "Maja Dimitrova", "Viktor Angelov"].map((name, index) => member("s2", `m${index}`, name, index === 0 ? "owner" : "member")),
    items: []
  },
  {
    id: "c81a7e55-52d9-4b1f-a6c3-9e0d4f2b8a77",
    name: "Proba 27",
    inviteCode: "P2R0B427",
    createdByUserId: "u1",
    createdAt: now,
    role: "owner",
    memberCount: 1,
    isActive: false,
    members: [member("s3", "u1", "Stefan Lazarevski", "owner")],
    items: [{ id: "i6", spaceId: "s3", name: "Prime drinks", quantity: "6", store: null, createdAt: now }]
  }
];

async function previewAction() {
  "use server";
  redirect("/preview/spaces?message=Preview%20only.%20Nothing%20was%20changed.");
}

export default async function PreviewSpaces({ searchParams }: PreviewProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const state = typeof params?.state === "string" ? params.state : "full";
  const message = typeof params?.message === "string" ? params.message : undefined;

  const toast = state === "error"
    ? { tone: "error" as const, message: "That invite code does not match any space. Check it and try again." }
    : message
      ? { tone: "success" as const, message }
      : null;

  return (
    <SpacesView
      displayName="Stefan Lazarevski"
      spaces={state === "empty" ? [] : sampleSpaces}
      toast={toast}
      actions={{ create: previewAction, join: previewAction, leave: previewAction, signOut: previewAction }}
    />
  );
}
