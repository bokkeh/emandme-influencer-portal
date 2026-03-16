import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db, users } from "@/lib/db";
import type { UserRole } from "@/lib/auth";

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

  return { ok: true as const, clerkUserId: userId };
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
      role?: UserRole;
      isActive?: boolean;
    };

    if (body.role === undefined && body.isActive === undefined) {
      return new NextResponse("No fields to update", { status: 400 });
    }

    const [target] = await db
      .select({ id: users.id, clerkUserId: users.clerkUserId, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!target) return new NextResponse("User not found", { status: 404 });

    if (body.role && !["admin", "influencer", "ugc_creator", "affiliate", "test_account"].includes(body.role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    // Prevent demoting the last active admin.
    if (target.role === "admin" && body.role && body.role !== "admin") {
      const [countRow] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, target.id)))
        .limit(1);
      if (!countRow) {
        return new NextResponse("You must keep at least one active admin.", { status: 400 });
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        role: body.role ?? undefined,
        isActive: body.isActive ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
      });

    if (!updated) return new NextResponse("Failed to update user", { status: 500 });

    try {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(target.clerkUserId, {
        publicMetadata: body.role ? { role: body.role } : undefined,
        privateMetadata: body.role ? { role: body.role } : undefined,
      });
    } catch {
      // Keep DB as source of truth if Clerk metadata update is temporarily unavailable.
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update team member";
    return new NextResponse(message, { status: 500 });
  }
}
