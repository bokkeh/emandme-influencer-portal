import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { syncInfluencerToHubSpot } from "@/lib/hubspot/sync";
import { normalizePhoneE164 } from "@/lib/phone";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const [row] = await db
      .select({
        userId: users.id,
        email: users.email,
        displayName: influencerProfiles.displayName,
        bio: influencerProfiles.bio,
        phone: influencerProfiles.phone,
        niche: influencerProfiles.niche,
        shippingAddressLine1: influencerProfiles.shippingAddressLine1,
        shippingAddressLine2: influencerProfiles.shippingAddressLine2,
        shippingCity: influencerProfiles.shippingCity,
        shippingState: influencerProfiles.shippingState,
        shippingPostalCode: influencerProfiles.shippingPostalCode,
        shippingCountry: influencerProfiles.shippingCountry,
      })
      .from(users)
      .leftJoin(influencerProfiles, eq(influencerProfiles.userId, users.id))
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!row) return new NextResponse("User not found", { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile";
    return new NextResponse(message, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      email,
      displayName,
      bio,
      phone,
      niche,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingCity,
      shippingState,
      shippingPostalCode,
      shippingCountry,
    } = body;

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user) return new NextResponse("User not found", { status: 404 });

    if (typeof email === "string" && email.trim()) {
      await db
        .update(users)
        .set({ email: email.trim().toLowerCase() })
        .where(eq(users.id, user.id));
    }

    const normalizedCountry =
      typeof shippingCountry === "string" && shippingCountry.trim()
        ? shippingCountry.trim().toUpperCase().slice(0, 2)
        : "US";
    const normalizedPhone =
      typeof phone === "string" && phone.trim() ? normalizePhoneE164(phone) : null;

    const [updated] = await db
      .insert(influencerProfiles)
      .values({
        userId: user.id,
        displayName: displayName || null,
        bio: bio || null,
        phone: normalizedPhone,
        niche: niche || null,
        shippingAddressLine1: shippingAddressLine1 || null,
        shippingAddressLine2: shippingAddressLine2 || null,
        shippingCity: shippingCity || null,
        shippingState: shippingState || null,
        shippingPostalCode: shippingPostalCode || null,
        shippingCountry: normalizedCountry,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: influencerProfiles.userId,
        set: {
          displayName: displayName || null,
          bio: bio || null,
          phone: normalizedPhone,
          niche: niche || null,
          shippingAddressLine1: shippingAddressLine1 || null,
          shippingAddressLine2: shippingAddressLine2 || null,
          shippingCity: shippingCity || null,
          shippingState: shippingState || null,
          shippingPostalCode: shippingPostalCode || null,
          shippingCountry: normalizedCountry,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (updated) {
      syncInfluencerToHubSpot({ influencerProfileId: updated.id }).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return new NextResponse(message, { status: 500 });
  }
}
