import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, campaigns, users } from "@/lib/db";

async function requireAdminApi() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { ok: false as const, status: 401, message: "Unauthorized" };

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return { ok: false as const, status: 403, message: "Forbidden" };
  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const { id } = await params;
    const body = (await req.json()) as {
      title?: string;
      description?: string | null;
      briefUrl?: string | null;
      status?: "draft" | "active" | "paused" | "completed" | "cancelled";
      totalBudget?: number | string | null;
      startDate?: string | null;
      endDate?: string | null;
    };

    const setValues = {
      title: body.title?.trim() ? body.title.trim() : undefined,
      description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
      briefUrl: body.briefUrl !== undefined ? (body.briefUrl?.trim() || null) : undefined,
      status: body.status,
      totalBudget:
        body.totalBudget !== undefined
          ? body.totalBudget !== null && body.totalBudget !== ""
            ? String(body.totalBudget)
            : null
          : undefined,
      startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
      updatedAt: new Date(),
    };

    const [updated] = await db.update(campaigns).set(setValues).where(eq(campaigns.id, id)).returning();
    if (!updated) return new NextResponse("Campaign not found", { status: 404 });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return new NextResponse(message, { status: 500 });
  }
}
