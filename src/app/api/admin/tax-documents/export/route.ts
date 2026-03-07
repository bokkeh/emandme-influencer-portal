import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db, influencerProfiles, payments, taxDocuments, users } from "@/lib/db";

function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
  return { ok: true as const };
}

export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear() - 1);
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return new NextResponse("Invalid year", { status: 400 });
  }
  if (format !== "csv" && format !== "pdf") {
    return new NextResponse("Invalid format", { status: 400 });
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [profiles, docs, paymentTotals] = await Promise.all([
    db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        taxLegalName: influencerProfiles.taxLegalName,
        taxClassification: influencerProfiles.taxClassification,
        taxIdLast4: influencerProfiles.taxIdLast4,
        taxFormSubmittedAt: influencerProfiles.taxFormSubmittedAt,
        userEmail: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(influencerProfiles)
      .innerJoin(users, eq(influencerProfiles.userId, users.id)),
    db
      .select({
        influencerProfileId: taxDocuments.influencerProfileId,
      })
      .from(taxDocuments)
      .where(and(eq(taxDocuments.taxYear, year), eq(taxDocuments.documentType, "1099_nec")))
      .orderBy(desc(taxDocuments.createdAt)),
    db
      .select({
        influencerProfileId: payments.influencerProfileId,
        amount: payments.amount,
      })
      .from(payments)
      .where(and(gte(payments.createdAt, start), lt(payments.createdAt, end))),
  ]);

  const hasDocSet = new Set(docs.map((d) => d.influencerProfileId));
  const totalsByProfile = new Map<string, number>();
  for (const row of paymentTotals) {
    const current = totalsByProfile.get(row.influencerProfileId) ?? 0;
    totalsByProfile.set(row.influencerProfileId, current + Number(row.amount ?? 0));
  }

  const rows = profiles.map((profile) => {
    const displayName =
      profile.displayName || `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || profile.userEmail;
    const missingTaxInfo = !profile.taxLegalName || !profile.taxClassification || !profile.taxIdLast4;
    return {
      displayName,
      email: profile.userEmail,
      taxLegalName: profile.taxLegalName ?? "",
      taxClassification: profile.taxClassification ?? "",
      taxIdLast4: profile.taxIdLast4 ? `***-${profile.taxIdLast4}` : "",
      taxSubmittedAt: profile.taxFormSubmittedAt ? profile.taxFormSubmittedAt.toISOString() : "",
      totalPaidInYear: totalsByProfile.get(profile.id) ?? 0,
      has1099: hasDocSet.has(profile.id) ? "yes" : "no",
      missingTaxInfo: missingTaxInfo ? "yes" : "no",
    };
  });

  if (format === "csv") {
    const header = [
      "display_name",
      "email",
      "tax_legal_name",
      "tax_classification",
      "tax_id_last4_masked",
      "tax_submitted_at",
      "total_paid_in_year",
      "has_1099",
      "missing_tax_info",
    ];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.displayName,
          row.email,
          row.taxLegalName,
          row.taxClassification,
          row.taxIdLast4,
          row.taxSubmittedAt,
          row.totalPaidInYear.toFixed(2),
          row.has1099,
          row.missingTaxInfo,
        ]
          .map(csvCell)
          .join(",")
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"tax-summary-${year}.csv\"`,
      },
    });
  }

  const lines: string[] = [
    `Em & Me Studio - 1099 Summary (${year})`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Profiles: ${rows.length}`,
    "",
    "Name | Email | Paid | Has 1099 | Missing Tax Info",
    "----------------------------------------------------------------",
  ];
  rows.slice(0, 45).forEach((row) => {
    lines.push(
      `${row.displayName.slice(0, 28)} | ${row.email.slice(0, 28)} | $${row.totalPaidInYear.toFixed(2)} | ${row.has1099} | ${row.missingTaxInfo}`
    );
  });
  if (rows.length > 45) lines.push(`...and ${rows.length - 45} more rows (use CSV export for full detail).`);

  const pdfBuffer = buildSimplePdf(lines);
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"tax-summary-${year}.pdf\"`,
    },
  });
}
