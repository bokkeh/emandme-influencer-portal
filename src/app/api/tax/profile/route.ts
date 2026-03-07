import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, influencerProfiles, users } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user) return new NextResponse("User not found", { status: 404 });

  const [profile] = await db
    .select({
      id: influencerProfiles.id,
      taxLegalName: influencerProfiles.taxLegalName,
      taxClassification: influencerProfiles.taxClassification,
      taxIdLast4: influencerProfiles.taxIdLast4,
      taxAddressLine1: influencerProfiles.taxAddressLine1,
      taxAddressLine2: influencerProfiles.taxAddressLine2,
      taxCity: influencerProfiles.taxCity,
      taxState: influencerProfiles.taxState,
      taxPostalCode: influencerProfiles.taxPostalCode,
      taxCountry: influencerProfiles.taxCountry,
      taxFormSubmittedAt: influencerProfiles.taxFormSubmittedAt,
    })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);

  if (!profile) return new NextResponse("Profile not found", { status: 404 });
  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user) return new NextResponse("User not found", { status: 404 });

  const body = (await req.json()) as {
    taxLegalName?: string;
    taxClassification?: string;
    taxIdLast4?: string;
    taxAddressLine1?: string;
    taxAddressLine2?: string;
    taxCity?: string;
    taxState?: string;
    taxPostalCode?: string;
    taxCountry?: string;
  };

  const normalize = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  const taxIdLast4 = normalize(body.taxIdLast4);
  if (taxIdLast4 && !/^\d{4}$/.test(taxIdLast4)) {
    return new NextResponse("Tax ID last 4 must be exactly 4 digits", { status: 400 });
  }

  const [updated] = await db
    .update(influencerProfiles)
    .set({
      taxLegalName: normalize(body.taxLegalName),
      taxClassification: normalize(body.taxClassification),
      taxIdLast4,
      taxAddressLine1: normalize(body.taxAddressLine1),
      taxAddressLine2: normalize(body.taxAddressLine2),
      taxCity: normalize(body.taxCity),
      taxState: normalize(body.taxState),
      taxPostalCode: normalize(body.taxPostalCode),
      taxCountry: normalize(body.taxCountry) ?? "US",
      taxFormSubmittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(influencerProfiles.userId, user.id))
    .returning({
      id: influencerProfiles.id,
      taxLegalName: influencerProfiles.taxLegalName,
      taxClassification: influencerProfiles.taxClassification,
      taxIdLast4: influencerProfiles.taxIdLast4,
      taxAddressLine1: influencerProfiles.taxAddressLine1,
      taxAddressLine2: influencerProfiles.taxAddressLine2,
      taxCity: influencerProfiles.taxCity,
      taxState: influencerProfiles.taxState,
      taxPostalCode: influencerProfiles.taxPostalCode,
      taxCountry: influencerProfiles.taxCountry,
      taxFormSubmittedAt: influencerProfiles.taxFormSubmittedAt,
    });

  if (!updated) return new NextResponse("Profile not found", { status: 404 });
  return NextResponse.json(updated);
}
