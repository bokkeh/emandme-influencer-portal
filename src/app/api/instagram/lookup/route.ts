import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadPublicFile } from "@/lib/storage";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

function extractUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // @username or bare username
  const handleMatch = trimmed.match(/^@?([A-Za-z0-9._]{1,30})$/);
  if (handleMatch) return handleMatch[1];

  // Full URL: https://www.instagram.com/username/
  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("instagram.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const first = (parts[0] ?? "").toLowerCase();
    const blocked = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "tv"]);
    if (!first || blocked.has(first)) return null;

    return first.replace(/^@/, "");
  } catch {
    return null;
  }

  return null;
}

function parseFollowerCount(text: string): number | null {
  // "1.2M Followers" | "125K Followers" | "12,345 Followers"
  const match = text.match(/([\d,.]+)\s*([KMkm]?)\s*[Ff]ollower/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ""));
  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;
  return Math.round(num * multiplier);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  if (role !== "admin") {
    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.clerkUserId, userId)).limit(1);
    role = dbUser?.role;
  }
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { url } = await req.json();
  const username = extractUsername(url ?? "");

  if (!username) {
    return NextResponse.json(
      { error: "Use an Instagram profile URL or @handle (not a post/reel URL)." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        username,
        name: null,
        avatarUrl: null,
        bio: null,
        followerCount: null,
        scraped: false,
      });
    }

    const html = await response.text();

    const metaContent = (property: string) => {
      const match =
        html.match(new RegExp(`<meta property="${property}" content="([^"]+)"`)) ??
        html.match(new RegExp(`<meta name="${property}" content="([^"]+)"`));
      return match ? decodeHtmlEntities(match[1]) : null;
    };

    const ogTitle = metaContent("og:title");
    const ogImage = metaContent("og:image");
    const ogDescription = metaContent("og:description");

    // og:title format: "Name (@handle) • Instagram photos and videos"
    let name: string | null = null;
    if (ogTitle) {
      const nameMatch = ogTitle.match(/^(.+?)\s*\(@/);
      if (nameMatch) {
        name = nameMatch[1].trim();
      } else {
        name = ogTitle.replace(/\s*[•·]\s*Instagram.*$/i, "").trim() || null;
      }
    }

    // og:description: "X Followers, X Following, X Posts - Name (@handle): bio text"
    let followerCount: number | null = null;
    let bio: string | null = null;
    if (ogDescription) {
      followerCount = parseFollowerCount(ogDescription);
      const bioMatch = ogDescription.match(/(?:\([^)]+\)|@\w+):\s*(.+)$/);
      if (bioMatch) bio = bioMatch[1].trim() || null;
    }

    // Download avatar and persist to configured storage so it doesn't expire
    let avatarUrl: string | null = null;
    if (ogImage) {
      try {
        const imgRes = await fetch(ogImage);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
          const ext = contentType.includes("png") ? "png" : "jpg";
          const uploaded = await uploadPublicFile(
            `avatars/instagram-${username}-${Date.now()}.${ext}`,
            imgBuffer,
            contentType
          );
          avatarUrl = uploaded.url;
        }
      } catch {
        // Storage upload failed - use the CDN URL directly as fallback
        avatarUrl = ogImage;
      }
    }

    return NextResponse.json({
      username,
      name,
      avatarUrl,
      bio,
      followerCount,
      scraped: !!(name || avatarUrl),
    });
  } catch {
    // Instagram blocked the request — return partial data
    return NextResponse.json({
      username,
      name: null,
      avatarUrl: null,
      bio: null,
      followerCount: null,
      scraped: false,
    });
  }
}
