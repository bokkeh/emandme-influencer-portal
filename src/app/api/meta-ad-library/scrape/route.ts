import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

type ScrapedAd = {
  adArchiveId: string;
  pageName: string | null;
  pageId: string | null;
  startedOn: string | null;
  adText: string | null;
};

function decode(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u0026/g, "&")
    .trim();
}

function extractSearchParams(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const defaults = {
    keyword: trimmed,
    country: "US",
  };

  if (!trimmed.includes("facebook.com/ads/library")) return defaults;

  try {
    const parsed = new URL(trimmed);
    const keyword = parsed.searchParams.get("q")?.trim() || "";
    const country = parsed.searchParams.get("country")?.trim().toUpperCase() || "US";
    return {
      keyword,
      country,
    };
  } catch {
    return defaults;
  }
}

function scrapeAdsFromHtml(html: string, maxResults: number): ScrapedAd[] {
  const ids = [...html.matchAll(/"ad_archive_id":"(\d+)"/g)].map((m) => m[1]);
  const uniqueIds = Array.from(new Set(ids)).slice(0, maxResults);

  return uniqueIds.map((id) => {
    const anchor = html.indexOf(`"ad_archive_id":"${id}"`);
    const windowStart = Math.max(0, anchor - 4000);
    const windowEnd = Math.min(html.length, anchor + 8000);
    const chunk = html.slice(windowStart, windowEnd);

    const pageNameMatch = chunk.match(/"page_name":"([^"]+)"/);
    const pageIdMatch = chunk.match(/"page_id":"([^"]+)"/);
    const startedOnMatch = chunk.match(/"start_date":"([^"]+)"/);
    const textMatch = chunk.match(/"ad_creative_body":"([^"]+)"/);

    return {
      adArchiveId: id,
      pageName: pageNameMatch ? decode(pageNameMatch[1]) : null,
      pageId: pageIdMatch ? decode(pageIdMatch[1]) : null,
      startedOn: startedOnMatch ? decode(startedOnMatch[1]) : null,
      adText: textMatch ? decode(textMatch[1]).slice(0, 240) : null,
    };
  });
}

async function resolveAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return false;

  let role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);
    role = dbUser?.role;
  }

  if (role !== "admin") {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      role = (clerkUser.publicMetadata as { role?: string } | null)?.role;
    } catch {
      // no-op
    }
  }

  return role === "admin";
}

export async function POST(req: Request) {
  const isAdmin = await resolveAdmin();
  if (!isAdmin) return new NextResponse("Forbidden", { status: 403 });

  const body = (await req.json()) as {
    query?: string;
    country?: string;
    maxResults?: number;
  };

  const parsed = extractSearchParams(body.query ?? "");
  if (!parsed || !parsed.keyword) {
    return NextResponse.json(
      { error: "Enter competitor brand keyword or paste a Meta Ad Library URL with a search query." },
      { status: 400 }
    );
  }

  const country = (body.country || parsed.country || "US").toUpperCase();
  const maxResults = Math.min(Math.max(body.maxResults ?? 20, 1), 100);
  const searchUrl =
    `https://www.facebook.com/ads/library/?active_status=all` +
    `&ad_type=all&country=${encodeURIComponent(country)}` +
    `&q=${encodeURIComponent(parsed.keyword)}` +
    `&search_type=keyword_unordered`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Meta Ad Library request failed (${response.status}).` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const ads = scrapeAdsFromHtml(html, maxResults);

    if (ads.length === 0) {
      return NextResponse.json({
        ads: [],
        searchUrl,
        note:
          "No ads parsed from page HTML. Meta can throttle or obfuscate responses. Try a broader keyword.",
      });
    }

    return NextResponse.json({
      ads,
      searchUrl,
      keyword: parsed.keyword,
      country,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
