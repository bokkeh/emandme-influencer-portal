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

  // Reconcile user by Clerk ID or email to avoid unique-email conflicts
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

  if (existingByClerkId) {
    [user] = await db
      .update(users)
      .set({
        email: email || existingByClerkId.email,
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
  } else {
    const [existingByEmail] = email
      ? await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
      : [undefined];

    if (existingByEmail) {
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
}
