import { db, discountCodes, campaigns } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

type ShopifyOrder = {
  discount_codes?: Array<{ code: string; amount: string; type: string }>;
  total_price?: string;
};

export async function POST(req: Request) {
  // Shopify HMAC verification (simplified — add crypto HMAC check in production)
  const body = await req.text();
  let order: ShopifyOrder;
  try {
    order = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const orderDiscountCodes = order.discount_codes ?? [];
  const orderTotal = parseFloat(order.total_price ?? "0");

  for (const dc of orderDiscountCodes) {
    const [code] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, dc.code.toUpperCase()))
      .limit(1);

    if (code) {
      await db
        .update(discountCodes)
        .set({
          usageCount: sql`${discountCodes.usageCount} + 1`,
          revenueGenerated: sql`${discountCodes.revenueGenerated} + ${orderTotal}`,
          updatedAt: new Date(),
        })
        .where(eq(discountCodes.id, code.id));

      // Update campaign revenue if linked
      if (code.campaignId) {
        await db
          .update(campaigns)
          .set({
            totalRevenue: sql`${campaigns.totalRevenue} + ${orderTotal}`,
            totalOrders: sql`${campaigns.totalOrders} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, code.campaignId));
      }
    }
  }

  return new Response("OK", { status: 200 });
}
