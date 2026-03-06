import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles, socialAccounts } from "@/lib/db";
import { googleChat } from "@/lib/notifications/google-chat";

export async function POST(req: Request) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const {
    email,
    firstName,
    lastName,
    tier,
    niche,
    notes,
    role: influencerRole,
    // Instagram import fields
    displayName,
    avatarUrl,
    instagramHandle,
    followerCount,
    bio,
  } = body;

  // Generate a placeholder email if none provided (roster-only profile)
  const resolvedEmail = email?.trim() || `${instagramHandle ?? "unknown"}_${Date.now()}@roster.noemail`;
  const isRealEmail = !resolvedEmail.includes("@roster.noemail");

  const clerk = await clerkClient();

  // Only send Clerk invitation if we have a real email
  if (isRealEmail) {
    await clerk.invitations.createInvitation({
      emailAddress: resolvedEmail,
      publicMetadata: { role: influencerRole ?? "influencer" },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
      ignoreExisting: true,
    });
  }

  // Create user record
  const resolvedFirstName = firstName?.trim() || (displayName ? displayName.split(" ")[0] : null) || null;
  const resolvedLastName = lastName?.trim() || (displayName && displayName.split(" ").length > 1
    ? displayName.split(" ").slice(1).join(" ")
    : null) || null;

  const [newUser] = await db
    .insert(users)
    .values({
      clerkUserId: `invited_${resolvedEmail}_${Date.now()}`,
      email: resolvedEmail,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      avatarUrl: avatarUrl ?? null,
      role: influencerRole ?? "influencer",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        avatarUrl: avatarUrl ?? null,
      },
    })
    .returning();

  if (!newUser) return new NextResponse("Failed to create user", { status: 500 });

  // Create influencer profile
  const [profile] = await db
    .insert(influencerProfiles)
    .values({
      userId: newUser.id,
      displayName: displayName ?? null,
      bio: bio ?? null,
      tier: tier ?? "nano",
      niche: niche ?? null,
      notes: notes ?? null,
    })
    .onConflictDoNothing()
    .returning();

  // Create social account if Instagram data provided
  if (profile && instagramHandle) {
    await db
      .insert(socialAccounts)
      .values({
        influencerProfileId: profile.id,
        platform: "instagram",
        handle: instagramHandle.replace(/^@/, ""),
        profileUrl: `https://www.instagram.com/${instagramHandle.replace(/^@/, "")}/`,
        followerCount: followerCount ? Number(followerCount) : 0,
        isPrimary: true,
      })
      .onConflictDoNothing();
  }

  if (profile) {
    const fallbackName = `${resolvedFirstName ?? ""} ${resolvedLastName ?? ""}`.trim();
    const name = (displayName ?? fallbackName) || resolvedEmail;
    googleChat.influencerJoined(name, tier ?? "nano", instagramHandle ? ["instagram"] : []).catch(() => {});
  }

  return NextResponse.json({ success: true, email: resolvedEmail, profileId: profile?.id }, { status: 201 });
}
