import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, influencerProfiles, taxDocuments, users } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (!user) return new NextResponse("User not found", { status: 404 });

  const [profile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.userId, user.id))
    .limit(1);
  if (!profile) return new NextResponse("Profile not found", { status: 404 });

  const docs = await db
    .select({
      id: taxDocuments.id,
      taxYear: taxDocuments.taxYear,
      documentType: taxDocuments.documentType,
      fileUrl: taxDocuments.fileUrl,
      fileName: taxDocuments.fileName,
      createdAt: taxDocuments.createdAt,
      updatedAt: taxDocuments.updatedAt,
    })
    .from(taxDocuments)
    .where(and(eq(taxDocuments.influencerProfileId, profile.id), eq(taxDocuments.documentType, "1099_nec")))
    .orderBy(desc(taxDocuments.taxYear), desc(taxDocuments.createdAt));

  return NextResponse.json(docs);
}
