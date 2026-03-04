import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "influencer" | "ugc_creator";

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  let role = (sessionClaims?.metadata as { role?: string })?.role as UserRole | undefined;

  // JWT claims can be stale — fall back to DB
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role as UserRole | undefined;
  }

  if (role !== "admin") redirect("/influencer/dashboard");
  return { userId, role: role as UserRole };
}

export async function requireInfluencer() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  let role = (sessionClaims?.metadata as { role?: string })?.role as UserRole | undefined;

  // JWT claims can be stale right after onboarding — fall back to DB
  if (!role || (role !== "influencer" && role !== "ugc_creator" && role !== "admin")) {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role as UserRole | undefined;
  }

  if (role !== "influencer" && role !== "ugc_creator") {
    if (role === "admin") redirect("/admin/dashboard");
    else redirect("/onboarding");
  }
  return { userId, role };
}

export async function getRole(): Promise<UserRole | null> {
  const { sessionClaims } = await auth();
  return ((sessionClaims?.metadata as { role?: string })?.role as UserRole) ?? null;
}
