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

  // Get Clerk user details
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  // Upsert user in DB (handles case where webhook never fired)
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: userId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      avatarUrl: clerkUser.imageUrl,
      role,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { role, updatedAt: new Date() },
    })
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
