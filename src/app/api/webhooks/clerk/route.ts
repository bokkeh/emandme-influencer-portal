import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, influencerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return new Response("Webhook secret not set", { status: 500 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address ?? "";

    const [user] = await db
      .insert(users)
      .values({
        clerkUserId: id,
        email,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        avatarUrl: image_url ?? null,
        role: "influencer",
      })
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: {
          email,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          avatarUrl: image_url ?? null,
        },
      })
      .returning();

    // Create a blank influencer profile
    if (user) {
      await db
        .insert(influencerProfiles)
        .values({ userId: user.id })
        .onConflictDoNothing();
    }
  }

  if (evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address ?? "";

    await db
      .update(users)
      .set({
        email,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        avatarUrl: image_url ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, id));
  }

  return new Response("OK", { status: 200 });
}
