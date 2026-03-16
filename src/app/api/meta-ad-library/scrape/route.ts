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

type GraphAd = {
  id?: string;
  ad_archive_id?: string;
  ad_creation_time?: string;
  page_id?: string;
  page_name?: string;
  ad_creative_body?: string;
};

type SearchSpec = {
  keyword: string | null;
  pageId: string | null;
  country: string;
  inputType: "keyword" | "ad_library_url" | "creator_marketplace_url";
};

class MetaGraphError extends Error {
  status: number;
  graphCode?: number;
  graphSubcode?: number;

  constructor(
    message: string,
    status: number,
    opts?: { graphCode?: number; graphSubcode?: number }
  ) {
    super(message);
    this.name = "MetaGraphError";
    this.status = status;
    this.graphCode = opts?.graphCode;
    this.graphSubcode = opts?.graphSubcode;
  }
}

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

async function scrapeAdsFromGraph(params: {
  keyword: string;
  country: string;
  maxResults: number;
}): Promise<ScrapedAd[]> {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("META_ACCESS_TOKEN is not configured.");

  const version = process.env.META_GRAPH_VERSION?.trim() || "v23.0";
  const url =
    `https://graph.facebook.com/${version}/ads_archive` +
    `?access_token=${encodeURIComponent(token)}` +
    `&search_terms=${encodeURIComponent(params.keyword)}` +
    `&ad_reached_countries=${encodeURIComponent(JSON.stringify([params.country]))}` +
    `&ad_type=ALL` +
    `&limit=${params.maxResults}` +
    `&fields=${encodeURIComponent(
      "id,ad_archive_id,ad_creation_time,page_id,page_name,ad_creative_body"
    )}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const raw = await res.text();
  let parsed: { data?: GraphAd[]; error?: { message?: string; code?: number; error_subcode?: number } };
  try {
    parsed = JSON.parse(raw) as {
      data?: GraphAd[];
      error?: { message?: string; code?: number; error_subcode?: number };
    };
  } catch {
    if (!res.ok) {
      throw new MetaGraphError(`Graph API request failed (${res.status}): ${raw.slice(0, 220)}`, res.status);
    }
    throw new Error("Graph API returned non-JSON response.");
  }

  if (!res.ok) {
    const graphMessage = parsed.error?.message || `Graph API request failed (${res.status})`;
    throw new MetaGraphError(graphMessage, res.status, {
      graphCode: parsed.error?.code,
      graphSubcode: parsed.error?.error_subcode,
    });
  }

  const rows = parsed.data ?? [];
  return rows
    .map((item) => ({
      adArchiveId: item.ad_archive_id || item.id || "",
      pageName: item.page_name ?? null,
      pageId: item.page_id ?? null,
      startedOn: item.ad_creation_time ?? null,
      adText: item.ad_creative_body ? item.ad_creative_body.slice(0, 240) : null,
    }))
    .filter((row) => row.adArchiveId.length > 0);
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

  return role === "admin" || role === "test_account";
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

  // Prefer official Graph Ads Archive API when keyword is available.
  if (parsed.keyword) {
    try {
      const graphAds = await scrapeAdsFromGraph({
        keyword: parsed.keyword,
        country,
        maxResults,
      });

      if (graphAds.length > 0) {
        return NextResponse.json({
          ads: graphAds,
          searchUrl,
          keyword: parsed.keyword,
          pageId: parsed.pageId,
          country,
          inputType: parsed.inputType,
          source: "graph_api",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Graph API unavailable";

      if (
        error instanceof MetaGraphError &&
        error.graphCode === 190 &&
        error.graphSubcode === 463
      ) {
        return NextResponse.json({
          ads: [],
          searchUrl,
          keyword: parsed.keyword,
          pageId: parsed.pageId,
          country,
          inputType: parsed.inputType,
          source: "graph_api",
          note:
            `Meta access token expired. ${message} ` +
            "Generate a new token in Meta Graph API Explorer/Marketing API tools, update META_ACCESS_TOKEN in Vercel + local env, then redeploy.",
        });
      }

      // Continue to HTML fallback.
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
          return NextResponse.json({
            ads: [],
            searchUrl,
            source: "fallback_html",
            note:
              `Graph API failed (${message}). HTML fallback was also blocked (${response.status}).`,
          });
        }

        const html = await response.text();
        const ads = scrapeAdsFromHtml(html, maxResults);
        return NextResponse.json({
          ads,
          searchUrl,
          keyword: parsed.keyword,
          pageId: parsed.pageId,
          country,
          inputType: parsed.inputType,
          source: "fallback_html",
          note:
            ads.length === 0
              ? `Graph API failed (${message}). HTML fallback returned no parseable ads.`
              : `Graph API failed (${message}). Showing HTML fallback results.`,
        });
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : "HTML fallback failed";
        return NextResponse.json({
          ads: [],
          searchUrl,
          source: "fallback_html",
          note: `Graph API failed (${message}). HTML fallback failed (${fallbackMessage}).`,
        });
      }
    }
  }

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
      source: "fallback_html",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scrape error";
    return NextResponse.json({
      ads: [],
      searchUrl,
      source: "fallback_html",
      note: `Scrape request failed: ${message}`,
    });
  }
}
