import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { googleChat } from "@/lib/notifications/google-chat";

export async function POST(req: Request) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const { email, firstName, lastName, tier, niche, notes, role: influencerRole } = body;

  if (!email) return new NextResponse("Email required", { status: 400 });

  const clerk = await clerkClient();

  // Send Clerk invitation
  await clerk.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role: influencerRole ?? "influencer" },
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    ignoreExisting: true,
  });

  // Pre-create user record (will be fully populated when they sign up via webhook)
  const [newUser] = await db
    .insert(users)
    .values({
      clerkUserId: `invited_${email}`, // Temp ID — replaced by webhook on actual signup
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role: influencerRole ?? "influencer",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { firstName: firstName ?? null, lastName: lastName ?? null },
    })
    .returning();

  if (newUser) {
    const [profile] = await db
      .insert(influencerProfiles)
      .values({
        userId: newUser.id,
        tier: tier ?? "nano",
        niche: niche ?? null,
        notes: notes ?? null,
      })
      .onConflictDoNothing()
      .returning();

    await googleChat.influencerJoined(
      `${firstName ?? ""} ${lastName ?? ""}`.trim() || email,
      tier ?? "nano",
      []
    );
  }

  return NextResponse.json({ success: true, email }, { status: 201 });
}
