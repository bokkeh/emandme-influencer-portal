import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, appSettings, users } from "@/lib/db";

const TAX_SETTING_KEYS = [
  "tax_payer_name",
  "tax_payer_tin",
  "tax_payer_address_line1",
  "tax_payer_address_line2",
  "tax_payer_city",
  "tax_payer_state",
  "tax_payer_postal_code",
  "tax_payer_country",
] as const;

type TaxSettingKey = (typeof TAX_SETTING_KEYS)[number];

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

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const rows = await db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(inArray(appSettings.key, [...TAX_SETTING_KEYS]));

  const result: Record<TaxSettingKey, string> = {
    tax_payer_name: "",
    tax_payer_tin: "",
    tax_payer_address_line1: "",
    tax_payer_address_line2: "",
    tax_payer_city: "",
    tax_payer_state: "",
    tax_payer_postal_code: "",
    tax_payer_country: "US",
  };

  for (const row of rows) {
    const key = row.key as TaxSettingKey;
    result[key] = row.value ?? "";
  }

  return NextResponse.json(result);
}

export async function PATCH(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  const body = (await req.json()) as Partial<Record<TaxSettingKey, string>>;
  const normalize = (value: string | undefined) => value?.trim() ?? "";

  const updates: Record<TaxSettingKey, string> = {
    tax_payer_name: normalize(body.tax_payer_name),
    tax_payer_tin: normalize(body.tax_payer_tin),
    tax_payer_address_line1: normalize(body.tax_payer_address_line1),
    tax_payer_address_line2: normalize(body.tax_payer_address_line2),
    tax_payer_city: normalize(body.tax_payer_city),
    tax_payer_state: normalize(body.tax_payer_state),
    tax_payer_postal_code: normalize(body.tax_payer_postal_code),
    tax_payer_country: normalize(body.tax_payer_country) || "US",
  };

  for (const key of TAX_SETTING_KEYS) {
    await db
      .insert(appSettings)
      .values({ key, value: updates[key], updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: updates[key],
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json(updates);
}
