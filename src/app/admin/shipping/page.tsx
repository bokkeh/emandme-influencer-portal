import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { influencerProfiles, shipments, users } from "@/lib/db/schema";
import { ShippingTrackerClient } from "@/components/admin/ShippingTrackerClient";

export default async function ShippingPage() {
  const [allShipments, allInfluencers] = await Promise.all([
    db
      .select({
        id: shipments.id,
        products: shipments.products,
        status: shipments.status,
        carrier: shipments.carrier,
        trackingNumber: shipments.trackingNumber,
        trackingUrl: shipments.trackingUrl,
        shippedAt: shipments.shippedAt,
        estimatedDeliveryAt: shipments.estimatedDeliveryAt,
        deliveredAt: shipments.deliveredAt,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        influencerName: influencerProfiles.displayName,
        influencerId: influencerProfiles.id,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(shipments)
      .innerJoin(influencerProfiles, eq(shipments.influencerProfileId, influencerProfiles.id))
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(desc(shipments.createdAt)),
    db
      .select({
        id: influencerProfiles.id,
        displayName: influencerProfiles.displayName,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(influencerProfiles)
      .innerJoin(users, eq(influencerProfiles.userId, users.id))
      .orderBy(desc(influencerProfiles.joinedAt)),
  ]);

  const influencerOptions = allInfluencers.map((inf) => ({
    id: inf.id,
    name: (inf.displayName ?? `${inf.firstName ?? ""} ${inf.lastName ?? ""}`.trim()) || inf.email,
    email: inf.email,
  }));

  return (
    <ShippingTrackerClient
      initialShipments={allShipments}
      influencerOptions={influencerOptions}
    />
  );
}
