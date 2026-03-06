import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, influencerRoster, influencerRosterActivities, users } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const note = asText(body.note);
  if (!note) return new NextResponse("Note is required", { status: 400 });

  const [profile] = await db.select({ id: influencerRoster.id }).from(influencerRoster).where(eq(influencerRoster.id, id)).limit(1);
  if (!profile) return new NextResponse("Roster profile not found", { status: 404 });

  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  await db.insert(influencerRosterActivities).values({
    rosterId: id,
    type: asText(body.type) ?? "note",
    note,
    createdByUserId: adminUser?.id ?? null,
  });

  const activities = await db
    .select()
    .from(influencerRosterActivities)
    .where(eq(influencerRosterActivities.rosterId, id))
    .orderBy(desc(influencerRosterActivities.createdAt));

  return NextResponse.json(activities, { status: 201 });
}
