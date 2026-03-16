import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, influencerProfiles, users } from "@/lib/db";
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

  return { ok: true as const };
}

function generateTemporaryPassword() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let password = "EmMe!";
  for (let i = 0; i < 14; i += 1) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  return password;
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.email));

    return NextResponse.json({ users: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load team members";
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (!guard.ok) return new NextResponse(guard.message, { status: guard.status });

  try {
    const body = (await req.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
    };

    const email = body.email?.trim().toLowerCase();
    const firstName = body.firstName?.trim() || null;
    const lastName = body.lastName?.trim() || null;
    const role = body.role;

    if (!email || !role) {
      return new NextResponse("Email and role are required", { status: 400 });
    }

    if (!["admin", "influencer", "ugc_creator", "affiliate", "test_account"].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return new NextResponse("A user with that email already exists.", { status: 400 });
    }

    const clerk = await clerkClient();
    const temporaryPassword = generateTemporaryPassword();

    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: temporaryPassword,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      publicMetadata: { role },
      privateMetadata: { role },
      skipPasswordChecks: true,
      skipPasswordRequirement: false,
    });

    const [created] = await db
      .insert(users)
      .values({
        clerkUserId: clerkUser.id,
        email,
        firstName,
        lastName,
        avatarUrl: clerkUser.imageUrl ?? null,
        role,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    if (created && role !== "admin" && role !== "test_account") {
      await db
        .insert(influencerProfiles)
        .values({ userId: created.id })
        .onConflictDoNothing();
    }

    return NextResponse.json({
      user: created,
      temporaryPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create team member";
    return new NextResponse(message, { status: 500 });
  }
}
