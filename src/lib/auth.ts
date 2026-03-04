import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "influencer" | "ugc_creator";

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") redirect("/influencer/dashboard");
  return { userId, role: role as UserRole };
}

export async function requireInfluencer() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "influencer" && role !== "ugc_creator") {
    if (role === "admin") redirect("/admin/dashboard");
    else redirect("/onboarding");
  }
  return { userId, role: role as UserRole };
}

export async function getRole(): Promise<UserRole | null> {
  const { sessionClaims } = await auth();
  return ((sessionClaims?.metadata as { role?: string })?.role as UserRole) ?? null;
}
