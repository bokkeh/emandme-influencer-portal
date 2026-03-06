"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ScrapedAd = {
  adArchiveId: string;
  pageName: string | null;
  pageId: string | null;
  startedOn: string | null;
  adText: string | null;
};

type ScrapeResponse = {
  ads: ScrapedAd[];
  searchUrl?: string;
  keyword?: string;
  pageId?: string;
  country?: string;
  inputType?: string;
  source?: "graph_api" | "fallback_html";
  note?: string;
  error?: string;
};

export function MetaAdLibraryScraper() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("US");
  const [maxResults, setMaxResults] = useState("25");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResponse | null>(null);

  async function runScrape() {
    if (!query.trim()) {
      toast.error("Enter a competitor keyword or paste an Ad Library search URL.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/meta-ad-library/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          country,
          maxResults: Number(maxResults) || 25,
        }),
      });

      const payload = (await res.json()) as ScrapeResponse;
      if (!res.ok) throw new Error(payload.error || "Failed to scrape Meta Ad Library");

      setResult(payload);
      if (payload.note) {
        if (payload.ads.length > 0) toast.warning(payload.note);
        else toast.info(payload.note);
      } else {
        toast.success(`Found ${payload.ads.length} ads`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scrape Meta Ad Library";
      toast.error(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meta Ad Library Scraper</h1>
        <p className="text-sm text-gray-500">
          Scrape competitor ad IDs and page hints from Meta Ad Library search pages.
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm py-4">
        <CardHeader>
          <CardTitle className="text-base">Search Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Competitor Keyword or Meta Ad Library URL</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: glossier or paste https://www.facebook.com/ads/library/?q=..."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Results</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxResults}
                onChange={(e) => setMaxResults(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full bg-rose-600 hover:bg-rose-700"
                disabled={loading}
                onClick={runScrape}
              >
                {loading ? "Scraping..." : "Run Scrape"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border border-gray-200 shadow-sm py-4">
          <CardHeader>
            <CardTitle className="text-base">
              Results ({result.ads.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.note && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {result.note}
              </div>
            )}
            {result.searchUrl && (
              <p className="text-xs text-gray-500">
                Source:{" "}
                <Link href={result.searchUrl} target="_blank" className="underline text-rose-600">
                  Open search URL
                </Link>
                {result.source && (
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                    {result.source === "graph_api" ? "Graph API" : "HTML fallback"}
                  </span>
                )}
              </p>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Ad</TableHead>
                    <TableHead>Page Name</TableHead>
                    <TableHead>Page ID</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Text Snippet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.ads.map((ad) => (
                    <TableRow key={ad.adArchiveId}>
                      <TableCell>
                        <Link
                          href={`https://www.facebook.com/ads/library/?id=${ad.adArchiveId}`}
                          target="_blank"
                          className="text-rose-600 underline"
                        >
                          {ad.adArchiveId}
                        </Link>
                      </TableCell>
                      <TableCell>{ad.pageName || "-"}</TableCell>
                      <TableCell>{ad.pageId || "-"}</TableCell>
                      <TableCell>{ad.startedOn || "-"}</TableCell>
                      <TableCell className="max-w-[460px] truncate">{ad.adText || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
