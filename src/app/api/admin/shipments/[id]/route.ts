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

function normalizeProducts(value: unknown): ShipmentProductInput[] | undefined {
  if (value === undefined) return undefined;
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      status?: "preparing" | "shipped" | "delivered" | "returned";
      products?: unknown;
      carrier?: string | null;
      trackingNumber?: string | null;
      trackingUrl?: string | null;
      notes?: string | null;
      shippedAt?: string | null;
      estimatedDeliveryAt?: string | null;
      deliveredAt?: string | null;
    };

    const products = normalizeProducts(body.products);
    if (products && products.length === 0) {
      return new NextResponse("Shipment must have at least one product", { status: 400 });
    }

    const [updated] = await db
      .update(shipments)
      .set({
        status: body.status ?? undefined,
        products: products ?? undefined,
        carrier: body.carrier !== undefined ? body.carrier?.trim() || null : undefined,
        trackingNumber:
          body.trackingNumber !== undefined ? body.trackingNumber?.trim() || null : undefined,
        trackingUrl: body.trackingUrl !== undefined ? body.trackingUrl?.trim() || null : undefined,
        notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
        shippedAt: body.shippedAt !== undefined ? (body.shippedAt ? new Date(body.shippedAt) : null) : undefined,
        estimatedDeliveryAt:
          body.estimatedDeliveryAt !== undefined
            ? body.estimatedDeliveryAt
              ? new Date(body.estimatedDeliveryAt)
              : null
            : undefined,
        deliveredAt:
          body.deliveredAt !== undefined ? (body.deliveredAt ? new Date(body.deliveredAt) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning({ id: shipments.id, status: shipments.status });

    if (!updated) return new NextResponse("Shipment not found", { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update shipment";
    return new NextResponse(message, { status: 500 });
  }
}
