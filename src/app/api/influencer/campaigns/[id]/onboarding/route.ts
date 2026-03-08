import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  db,
  users,
  influencerProfiles,
  campaignInfluencers,
  campaigns,
  shipments,
} from "@/lib/db";

type CampaignProduct = {
  shopifyProductId?: string;
  title: string;
  imageUrl?: string;
  variantId?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      displayName?: string;
      phone?: string;
      niche?: string;
      shippingAddressLine1?: string;
      shippingAddressLine2?: string;
      shippingCity?: string;
      shippingState?: string;
      shippingPostalCode?: string;
      shippingCountry?: string;
      petName?: string;
      petBreed?: string;
      petAge?: string;
      petPersonality?: string;
      tagPersonalizationText?: string;
      selectedProductId?: string;
      selectedProductTitle?: string;
      selectedProductVariantId?: string;
    };

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    if (!user) return new NextResponse("User not found", { status: 404 });

    const [profile] = await db
      .select({ id: influencerProfiles.id })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.userId, user.id))
      .limit(1);
    if (!profile) return new NextResponse("Profile not found", { status: 404 });

    const [campaign] = await db
      .select({
        id: campaigns.id,
        products: campaigns.products,
      })
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);
    if (!campaign) return new NextResponse("Campaign not found", { status: 404 });

    const [enrollment] = await db
      .select({
        id: campaignInfluencers.id,
        status: campaignInfluencers.status,
      })
      .from(campaignInfluencers)
      .where(
        and(
          eq(campaignInfluencers.campaignId, id),
          eq(campaignInfluencers.influencerProfileId, profile.id)
        )
      )
      .limit(1);
    if (!enrollment) return new NextResponse("Campaign enrollment not found", { status: 404 });

    if (!["accepted", "active", "completed"].includes(enrollment.status)) {
      return new NextResponse("Enrollment must be approved first", { status: 400 });
    }

    const requiredProfileValues = [
      body.displayName,
      body.phone,
      body.niche,
      body.shippingAddressLine1,
      body.shippingCity,
      body.shippingState,
      body.shippingPostalCode,
    ];
    if (requiredProfileValues.some((v) => !String(v ?? "").trim())) {
      return new NextResponse("Complete all required profile fields", { status: 400 });
    }

    if (
      !body.petName?.trim() ||
      !body.petBreed?.trim() ||
      !body.petAge?.trim() ||
      !body.petPersonality?.trim() ||
      !body.tagPersonalizationText?.trim()
    ) {
      return new NextResponse("Complete all pet/tag fields", { status: 400 });
    }

    const displayName = String(body.displayName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const niche = String(body.niche ?? "").trim();
    const shippingAddressLine1 = String(body.shippingAddressLine1 ?? "").trim();
    const shippingAddressLine2 = body.shippingAddressLine2?.trim() || null;
    const shippingCity = String(body.shippingCity ?? "").trim();
    const shippingState = String(body.shippingState ?? "").trim();
    const shippingPostalCode = String(body.shippingPostalCode ?? "").trim();
    const petName = String(body.petName ?? "").trim();
    const petBreed = String(body.petBreed ?? "").trim();
    const petAge = String(body.petAge ?? "").trim();
    const petPersonality = String(body.petPersonality ?? "").trim();
    const tagPersonalizationText = String(body.tagPersonalizationText ?? "").trim();

    const campaignProducts = (campaign.products ?? []) as CampaignProduct[];
    const selectedProduct = campaignProducts.find(
      (p) => p.shopifyProductId === body.selectedProductId
    );

    const selectedTitle =
      body.selectedProductTitle?.trim() || selectedProduct?.title?.trim() || "";
    if (!selectedTitle) {
      return new NextResponse("Select a campaign tag/product", { status: 400 });
    }

    const selectedId =
      body.selectedProductId?.trim() || selectedProduct?.shopifyProductId || null;
    const selectedVariantId =
      body.selectedProductVariantId?.trim() || selectedProduct?.variantId || null;

    const normalizedCountry =
      body.shippingCountry?.trim().toUpperCase().slice(0, 2) || "US";

    await db
      .update(influencerProfiles)
      .set({
        displayName,
        phone,
        niche,
        shippingAddressLine1,
        shippingAddressLine2,
        shippingCity,
        shippingState,
        shippingPostalCode,
        shippingCountry: normalizedCountry,
        updatedAt: new Date(),
      })
      .where(eq(influencerProfiles.id, profile.id));

    await db
      .update(campaignInfluencers)
      .set({
        petName,
        petBreed,
        petAge,
        petPersonality,
        tagPersonalizationText,
        selectedProductId: selectedId,
        selectedProductTitle: selectedTitle,
        selectedProductVariantId: selectedVariantId,
        petInfoSubmittedAt: new Date(),
        onboardingSubmittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(campaignInfluencers.id, enrollment.id));

    const [existingShipment] = await db
      .select({ id: shipments.id, notes: shipments.notes })
      .from(shipments)
      .where(
        and(
          eq(shipments.campaignId, id),
          eq(shipments.influencerProfileId, profile.id)
        )
      )
      .limit(1);

    const orderNotes = [
      "Campaign onboarding confirmed by influencer.",
      `Tag personalization: ${tagPersonalizationText}`,
      `Pet: ${petName} (${petBreed}, ${petAge})`,
      `Personality: ${petPersonality}`,
    ].join("\n");

    if (existingShipment) {
      await db
        .update(shipments)
        .set({
          products: [
            {
              name: selectedTitle,
              qty: 1,
              shopifyProductId: selectedId ?? undefined,
              variant: selectedVariantId ?? undefined,
            },
          ],
          notes: orderNotes,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, existingShipment.id));
    } else {
      await db.insert(shipments).values({
        influencerProfileId: profile.id,
        campaignId: id,
        status: "preparing",
        products: [
          {
            name: selectedTitle,
            qty: 1,
            shopifyProductId: selectedId ?? undefined,
            variant: selectedVariantId ?? undefined,
          },
        ],
        notes: orderNotes,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit campaign onboarding";
    return new NextResponse(message, { status: 500 });
  }
}
