import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { googleChat } from "@/lib/notifications/google-chat";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { role } = await req.json();
    if (!["influencer", "ugc_creator", "affiliate"].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    const clerk = await clerkClient();

    // Set role in Clerk metadata (non-blocking if Clerk is temporarily unavailable)
    try {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { role },
      });
    } catch (error) {
      console.error("[onboarding] Failed to update Clerk metadata:", error);
    }

    // Get Clerk user details
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    if (!email) {
      return new NextResponse("No email returned from auth provider for this account.", { status: 400 });
    }

    // Reconcile user by Clerk ID or email to avoid unique conflicts
    let user:
      | {
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
        }
      | undefined;

    const [existingByClerkId] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    const [existingByEmail] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        clerkUserId: users.clerkUserId,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingByClerkId) {
      // If email is already taken by another row, keep current row's email to avoid unique conflict
      const safeEmail =
        existingByEmail && existingByEmail.id !== existingByClerkId.id ? existingByClerkId.email : email;

      [user] = await db
        .update(users)
        .set({
          email: safeEmail,
          firstName: clerkUser.firstName ?? existingByClerkId.firstName,
          lastName: clerkUser.lastName ?? existingByClerkId.lastName,
          avatarUrl: clerkUser.imageUrl ?? null,
          role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByClerkId.id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        });
    } else if (existingByEmail) {
      [user] = await db
        .update(users)
        .set({
          clerkUserId: userId,
          firstName: clerkUser.firstName ?? existingByEmail.firstName,
          lastName: clerkUser.lastName ?? existingByEmail.lastName,
          avatarUrl: clerkUser.imageUrl ?? null,
          role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        });
    } else {
      [user] = await db
        .insert(users)
        .values({
          clerkUserId: userId,
          email,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatarUrl: clerkUser.imageUrl,
          role,
        })
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        });
    }

    if (user) {
      // Ensure influencer profile exists
      await db
        .insert(influencerProfiles)
        .values({ userId: user.id })
        .onConflictDoNothing();

      // Notify Google Chat (fire-and-forget — don't block response)
      googleChat.influencerJoined(
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
        "nano",
        []
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected onboarding error";
    console.error("[onboarding] Error:", message);
    return new NextResponse(message, { status: 500 });
  }
}
