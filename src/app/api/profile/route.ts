import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, influencerProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { syncInfluencerToHubSpot } from "@/lib/hubspot/sync";

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
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

    const normalizedCountry =
      typeof shippingCountry === "string" && shippingCountry.trim()
        ? shippingCountry.trim().toUpperCase().slice(0, 2)
        : "US";

    const [updated] = await db
      .insert(influencerProfiles)
      .values({
        userId: user.id,
        displayName: displayName || null,
        bio: bio || null,
        phone: phone || null,
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
          phone: phone || null,
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
