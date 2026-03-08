import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, shipments, users } from "@/lib/db";

type ShipmentProductInput = {
  name: string;
  qty: number;
  variant?: string;
  shopifyProductId?: string;
};

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };

  return { ok: true as const };
}

function normalizeProducts(value: unknown): ShipmentProductInput[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item): ShipmentProductInput | null => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      const qty = Number(raw.qty ?? 1);
      if (!name || !Number.isFinite(qty) || qty <= 0) return null;
      const base: ShipmentProductInput = {
        name,
        qty: Math.max(1, Math.round(qty)),
      };
      if (typeof raw.variant === "string" && raw.variant.trim()) {
        base.variant = raw.variant.trim();
      }
      if (typeof raw.shopifyProductId === "string" && raw.shopifyProductId.trim()) {
        base.shopifyProductId = raw.shopifyProductId.trim();
      }
      return base;
    })
    .filter((v): v is ShipmentProductInput => v !== null);
  return normalized;
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const body = (await req.json()) as {
      influencerProfileId?: string;
      campaignId?: string | null;
      products?: unknown;
      status?: "preparing" | "shipped" | "delivered" | "returned";
      carrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      notes?: string | null;
      shippedAt?: string | null;
      estimatedDeliveryAt?: string | null;
      deliveredAt?: string | null;
    };

    if (!body.influencerProfileId) {
      return new NextResponse("Missing influencerProfileId", { status: 400 });
    }

    const products = normalizeProducts(body.products);
    if (products.length === 0) {
      return new NextResponse("Add at least one product", { status: 400 });
    }

    const [created] = await db
      .insert(shipments)
      .values({
        influencerProfileId: body.influencerProfileId,
        campaignId: body.campaignId ?? null,
        products,
        status: body.status ?? "preparing",
        carrier: body.carrier?.trim() || null,
        trackingNumber: body.trackingNumber?.trim() || null,
        trackingUrl: body.trackingUrl?.trim() || null,
        notes: body.notes?.trim() || null,
        shippedAt: body.shippedAt ? new Date(body.shippedAt) : null,
        estimatedDeliveryAt: body.estimatedDeliveryAt ? new Date(body.estimatedDeliveryAt) : null,
        deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : null,
      })
      .returning({ id: shipments.id });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create shipment";
    return new NextResponse(message, { status: 500 });
  }
}
