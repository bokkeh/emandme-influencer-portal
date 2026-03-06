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

type SearchSpec = {
  keyword: string | null;
  pageId: string | null;
  country: string;
  inputType: "keyword" | "ad_library_url" | "creator_marketplace_url";
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

function extractSearchParams(input: string): SearchSpec | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const defaults: SearchSpec = {
    keyword: trimmed,
    pageId: null,
    country: "US",
    inputType: "keyword",
  };

  if (!trimmed.includes("facebook.com/ads/library") && !trimmed.includes("business.facebook.com")) {
    return defaults;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const keyword = parsed.searchParams.get("q")?.trim() || null;
    const country = parsed.searchParams.get("country")?.trim().toUpperCase() || "US";
    const pageId =
      parsed.searchParams.get("view_all_page_id")?.trim() ||
      parsed.searchParams.get("asset_id")?.trim() ||
      parsed.searchParams.get("cr_pf")?.trim() ||
      null;

    return {
      keyword,
      pageId,
      country,
      inputType: host.includes("business.facebook.com")
        ? "creator_marketplace_url"
        : "ad_library_url",
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
  if (!parsed || (!parsed.keyword && !parsed.pageId)) {
    return NextResponse.json(
      {
        ads: [],
        note:
          "Enter competitor keyword, Meta Ad Library URL, or creator marketplace URL containing asset_id / page id.",
      }
    );
  }

  const country = (body.country || parsed.country || "US").toUpperCase();
  const maxResults = Math.min(Math.max(body.maxResults ?? 20, 1), 100);
  const searchUrl = parsed.pageId
    ? `https://www.facebook.com/ads/library/?active_status=all` +
      `&ad_type=all&country=${encodeURIComponent(country)}` +
      `&view_all_page_id=${encodeURIComponent(parsed.pageId)}&search_type=page`
    : `https://www.facebook.com/ads/library/?active_status=all` +
      `&ad_type=all&country=${encodeURIComponent(country)}` +
      `&q=${encodeURIComponent(parsed.keyword ?? "")}` +
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
        {
          ads: [],
          searchUrl,
          note:
            `Meta Ad Library blocked or throttled this request (${response.status}). ` +
            "Try a simpler keyword, change country, or retry in a few minutes.",
        }
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
      pageId: parsed.pageId,
      country,
      inputType: parsed.inputType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    return NextResponse.json({
      ads: [],
      searchUrl,
      note: `Scrape request failed: ${message}`,
    });
  }
}
