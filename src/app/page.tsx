import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export default async function RootPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!user) {
    redirect("/onboarding");
  }

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/influencer/dashboard");
  }
}
