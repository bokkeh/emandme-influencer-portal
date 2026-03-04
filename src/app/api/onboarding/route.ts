import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { googleChat } from "@/lib/notifications/google-chat";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { role } = await req.json();
  if (!["influencer", "ugc_creator"].includes(role)) {
    return new NextResponse("Invalid role", { status: 400 });
  }

  const clerk = await clerkClient();

  // Set role in Clerk metadata
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  // Update role in DB
  const [user] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.clerkUserId, userId))
    .returning();

  if (user) {
    // Ensure influencer profile exists
    await db
      .insert(influencerProfiles)
      .values({ userId: user.id })
      .onConflictDoNothing();

    // Notify Google Chat
    await googleChat.influencerJoined(
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
      "nano",
      []
    );
  }

  return NextResponse.json({ success: true, role });
}
