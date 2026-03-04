import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

// One-time use: promotes the currently logged-in user to admin in both DB and Clerk metadata.
// Hit GET /api/dev/promote-admin while signed in.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Update DB role
  await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.clerkUserId, userId));

  // Update Clerk metadata
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role: "admin" },
  });

  return NextResponse.json({ ok: true, message: "You are now admin. Sign out and sign back in." });
}
