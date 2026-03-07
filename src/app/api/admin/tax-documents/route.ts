import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";
import { db, influencerProfiles, taxDocuments, users } from "@/lib/db";

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const, userId };
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const [profiles, docs] = await Promise.all([
    db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        taxLegalName: influencerProfiles.taxLegalName,
        taxIdLast4: influencerProfiles.taxIdLast4,
        taxFormSubmittedAt: influencerProfiles.taxFormSubmittedAt,
      })
      .from(influencerProfiles)
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(influencerProfiles.joinedAt),
    db
      .select({
        id: taxDocuments.id,
        influencerProfileId: taxDocuments.influencerProfileId,
        taxYear: taxDocuments.taxYear,
        documentType: taxDocuments.documentType,
        fileUrl: taxDocuments.fileUrl,
        fileName: taxDocuments.fileName,
        createdAt: taxDocuments.createdAt,
        updatedAt: taxDocuments.updatedAt,
      })
      .from(taxDocuments)
      .orderBy(desc(taxDocuments.taxYear), desc(taxDocuments.createdAt)),
  ]);

  return NextResponse.json({ profiles, docs });
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const influencerProfileId = String(formData.get("influencerProfileId") ?? "");
  const taxYear = Number(formData.get("taxYear") ?? 0);
  const documentType = String(formData.get("documentType") ?? "1099_nec");

  if (!file) return new NextResponse("No file uploaded", { status: 400 });
  if (!influencerProfileId) return new NextResponse("Influencer profile is required", { status: 400 });
  if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) {
    return new NextResponse("Tax year is invalid", { status: 400 });
  }

  const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, guard.userId)).limit(1);
  if (!adminUser) return new NextResponse("Admin user not found", { status: 404 });

  const [profile] = await db
    .select({ id: influencerProfiles.id })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.id, influencerProfileId))
    .limit(1);
  if (!profile) return new NextResponse("Influencer profile not found", { status: 404 });

  const ext = file.name.split(".").pop() ?? "pdf";
  const pathname = `tax-documents/${influencerProfileId}/${taxYear}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || "application/pdf",
  });

  const [saved] = await db
    .insert(taxDocuments)
    .values({
      influencerProfileId,
      taxYear,
      documentType,
      fileUrl: blob.url,
      fileName: file.name,
      uploadedByUserId: adminUser.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [taxDocuments.influencerProfileId, taxDocuments.taxYear, taxDocuments.documentType],
      set: {
        fileUrl: blob.url,
        fileName: file.name,
        uploadedByUserId: adminUser.id,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(saved, { status: 201 });
}
