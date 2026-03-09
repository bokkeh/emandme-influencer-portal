import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "influencer" | "ugc_creator" | "affiliate";

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

export function isEmailSuperAdmin(email: string | null | undefined) {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  const configured = (process.env.SUPERADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(normalized);
}

export async function isSuperAdminByUserId(userId: string) {
  const configuredUserIds = (process.env.SUPERADMIN_USER_IDS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (configuredUserIds.includes(userId)) return true;

  const [dbUser] = await db.select({ email: users.email }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
  return isEmailSuperAdmin(dbUser?.email);
}

export async function requireInfluencer() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  let role = (sessionClaims?.metadata as { role?: string })?.role as UserRole | undefined;

  // JWT claims can be stale right after onboarding — fall back to DB
  if (!role || (role !== "influencer" && role !== "ugc_creator" && role !== "affiliate" && role !== "admin")) {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role as UserRole | undefined;
  }

  if (role !== "influencer" && role !== "ugc_creator" && role !== "affiliate") {
    if (role === "admin") {
      const superAdmin = await isSuperAdminByUserId(userId);
      if (!superAdmin) redirect("/admin/dashboard");
      return { userId, role };
    }
    else redirect("/onboarding");
  }
  return { userId, role };
}

export async function getRole(): Promise<UserRole | null> {
  const { sessionClaims } = await auth();
  return ((sessionClaims?.metadata as { role?: string })?.role as UserRole) ?? null;
}
