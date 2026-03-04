import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncInfluencerToHubSpot } from "@/lib/hubspot/sync";

export async function POST(req: Request) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { influencerProfileId } = await req.json();
  if (!influencerProfileId) return new NextResponse("Missing influencerProfileId", { status: 400 });

  await syncInfluencerToHubSpot({ influencerProfileId });

  return NextResponse.json({ success: true });
}
