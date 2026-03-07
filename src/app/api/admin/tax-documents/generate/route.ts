import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { db, appSettings, influencerProfiles, payments, taxDocuments, users } from "@/lib/db";

function escapeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildSimplePdf(textLines: string[]) {
  const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contentLines = ["BT", "/F1 10 Tf", "50 790 Td", "14 TL"];
  textLines.forEach((line, idx) => {
    if (idx === 0) contentLines.push(`(${escapePdfText(line)}) Tj`);
    else contentLines.push(`T* (${escapePdfText(line)}) Tj`);
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const, clerkUserId: userId };
}

type Payload = {
  taxYear?: number;
  influencerProfileId?: string;
  generateAll?: boolean;
};

type PayerSettings = {
  name: string;
  tin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const body = (await req.json()) as Payload;
  const taxYear = Number(body.taxYear ?? new Date().getUTCFullYear() - 1);
  const generateAll = Boolean(body.generateAll);
  const influencerProfileId = body.influencerProfileId?.trim() || null;

  if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) {
    return new NextResponse("Invalid tax year", { status: 400 });
  }
  if (!generateAll && !influencerProfileId) {
    return new NextResponse("influencerProfileId is required unless generateAll is true", { status: 400 });
  }

  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, guard.clerkUserId))
    .limit(1);
  if (!adminUser) return new NextResponse("Admin user not found", { status: 404 });

  const settingRows = await db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(
      inArray(appSettings.key, [
        "tax_payer_name",
        "tax_payer_tin",
        "tax_payer_address_line1",
        "tax_payer_address_line2",
        "tax_payer_city",
        "tax_payer_state",
        "tax_payer_postal_code",
        "tax_payer_country",
      ])
    );
  const payer: PayerSettings = {
    name: "",
    tin: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  };
  for (const row of settingRows) {
    if (row.key === "tax_payer_name") payer.name = row.value ?? "";
    if (row.key === "tax_payer_tin") payer.tin = row.value ?? "";
    if (row.key === "tax_payer_address_line1") payer.addressLine1 = row.value ?? "";
    if (row.key === "tax_payer_address_line2") payer.addressLine2 = row.value ?? "";
    if (row.key === "tax_payer_city") payer.city = row.value ?? "";
    if (row.key === "tax_payer_state") payer.state = row.value ?? "";
    if (row.key === "tax_payer_postal_code") payer.postalCode = row.value ?? "";
    if (row.key === "tax_payer_country") payer.country = row.value ?? "US";
  }

  const profilesQuery = db
    .select({
      id: influencerProfiles.id,
      displayName: influencerProfiles.displayName,
      taxLegalName: influencerProfiles.taxLegalName,
      taxClassification: influencerProfiles.taxClassification,
      taxIdLast4: influencerProfiles.taxIdLast4,
      taxAddressLine1: influencerProfiles.taxAddressLine1,
      taxAddressLine2: influencerProfiles.taxAddressLine2,
      taxCity: influencerProfiles.taxCity,
      taxState: influencerProfiles.taxState,
      taxPostalCode: influencerProfiles.taxPostalCode,
      taxCountry: influencerProfiles.taxCountry,
      userEmail: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id));

  const profiles = generateAll
    ? await profilesQuery
    : await profilesQuery.where(eq(influencerProfiles.id, influencerProfileId!));

  if (profiles.length === 0) return new NextResponse("No matching profiles found", { status: 404 });

  const profileIds = profiles.map((p) => p.id);
  const paidRows = await db
    .select({
      influencerProfileId: payments.influencerProfileId,
      amount: payments.amount,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(and(eq(payments.status, "paid"), inArray(payments.influencerProfileId, profileIds)));

  const totalsByProfile = new Map<string, number>();
  for (const row of paidRows) {
    const paymentDate = row.paidAt ?? row.createdAt;
    if (!paymentDate) continue;
    const year = new Date(paymentDate).getUTCFullYear();
    if (year !== taxYear) continue;
    const current = totalsByProfile.get(row.influencerProfileId) ?? 0;
    totalsByProfile.set(row.influencerProfileId, current + Number(row.amount ?? 0));
  }

  const generated: Array<{ influencerProfileId: string; name: string; total: number; fileUrl: string }> = [];
  const skipped: Array<{ influencerProfileId: string; name: string; reason: string }> = [];

  for (const profile of profiles) {
    const name =
      profile.displayName || `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || profile.userEmail;
    const missingTax =
      !profile.taxLegalName ||
      !profile.taxClassification ||
      !profile.taxIdLast4 ||
      !profile.taxAddressLine1 ||
      !profile.taxCity ||
      !profile.taxState ||
      !profile.taxPostalCode;
    if (missingTax) {
      skipped.push({ influencerProfileId: profile.id, name, reason: "Missing required tax profile fields" });
      continue;
    }

    const totalPaid = totalsByProfile.get(profile.id) ?? 0;
    if (totalPaid <= 0) {
      skipped.push({ influencerProfileId: profile.id, name, reason: `No paid amount found in ${taxYear}` });
      continue;
    }

    const pdfLines = [
      `Form 1099-NEC (Draft Layout) - Tax Year ${taxYear}`,
      "",
      "THIS DOCUMENT IS A DRAFT GENERATED FROM PORTAL DATA.",
      "Use official filing software / accountant process for IRS submission.",
      "",
      "PAYER (YOUR COMPANY)",
      `Name: ${payer.name || "[MISSING: tax_payer_name]"}`,
      `TIN: ${payer.tin || "[MISSING: tax_payer_tin]"}`,
      `Address: ${payer.addressLine1 || "[MISSING: tax_payer_address_line1]"}${payer.addressLine2 ? `, ${payer.addressLine2}` : ""}`,
      `City/State/ZIP: ${payer.city || ""}${payer.city ? ", " : ""}${payer.state || ""} ${payer.postalCode || ""}`.trim(),
      `Country: ${payer.country || "US"}`,
      "",
      "RECIPIENT (INFLUENCER / CREATOR)",
      `Legal Name: ${profile.taxLegalName}`,
      `Display Name: ${name}`,
      `Email: ${profile.userEmail}`,
      `Tax Classification: ${profile.taxClassification}`,
      `Tax ID Last 4: ***-${profile.taxIdLast4}`,
      `Address: ${profile.taxAddressLine1}${profile.taxAddressLine2 ? `, ${profile.taxAddressLine2}` : ""}`,
      `City/State/ZIP: ${profile.taxCity}, ${profile.taxState} ${profile.taxPostalCode}`,
      `Country: ${profile.taxCountry ?? "US"}`,
      "",
      "BOXES",
      `Box 1 Nonemployee Compensation: $${totalPaid.toFixed(2)}`,
      "Box 4 Federal income tax withheld: $0.00",
      "State/Local boxes: Not populated in draft",
      "",
      `Generated At: ${new Date().toISOString()}`,
    ];
    const pdfBuffer = buildSimplePdf(pdfLines);
    const safeName = escapeFileName(profile.taxLegalName || name || profile.id);
    const filename = `1099-nec-${taxYear}-${safeName}.pdf`;
    const blob = await put(`tax-documents/generated/${profile.id}/${taxYear}/${filename}`, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
    });

    await db
      .insert(taxDocuments)
      .values({
        influencerProfileId: profile.id,
        taxYear,
        documentType: "1099_nec",
        fileUrl: blob.url,
        fileName: filename,
        uploadedByUserId: adminUser.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [taxDocuments.influencerProfileId, taxDocuments.taxYear, taxDocuments.documentType],
        set: {
          fileUrl: blob.url,
          fileName: filename,
          uploadedByUserId: adminUser.id,
          updatedAt: new Date(),
        },
      });

    generated.push({ influencerProfileId: profile.id, name, total: totalPaid, fileUrl: blob.url });
  }

  return NextResponse.json({
    taxYear,
    generatedCount: generated.length,
    skippedCount: skipped.length,
    generated,
    skipped,
  });
}
