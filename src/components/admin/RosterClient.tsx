"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Download,
  ExternalLink,
  FileUp,
  Mail,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Users,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  CREATOR_TYPES,
  INFLUENCER_TIERS,
  ROSTER_PLATFORMS,
  ROSTER_STATUSES,
  STRIPE_PAYOUT_STATUSES,
  type CreatorType,
  type InfluencerTier,
  type InfluencerProfile,
  type RosterActivity,
  type RosterPlatform,
  type RosterStatus,
  type StripePayoutStatus,
} from "@/types/roster";

type DetailResponse = {
  profile: InfluencerProfile;
  activities: RosterActivity[];
};

type RosterClientProps = {
  title?: string;
  subtitle?: string;
};

type SortKey = "name_asc" | "follower_desc" | "engagement_desc" | "contacted_desc";
type SortDirection = "asc" | "desc";
type ColumnSortKey =
  | "fullName"
  | "handle"
  | "platform"
  | "niche"
  | "location"
  | "followerCount"
  | "engagementRate"
  | "email"
  | "manager"
  | "status"
  | "lastContactedAt"
  | "tags";
type ColumnSortState = { key: ColumnSortKey; direction: SortDirection };

type RosterForm = {
  fullName: string;
  handle: string;
  platform: RosterPlatform;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  pinterestUrl: string;
  otherProfileUrl: string;
  portfolioUrl: string;
  avatarUrl: string;
  email: string;
  phone: string;
  manager: string;
  creatorType: CreatorType;
  influencerTier: InfluencerTier;
  niche: string;
  location: string;
  audienceNotes: string;
  followerCount: string;
  engagementRate: string;
  avgViews: string;
  contentStyleNotes: string;
  brandFitScore: string;
  totalRevenueGenerated: string;
  totalCampaigns: string;
  stripePayoutStatus: StripePayoutStatus;
  portalProfileUrl: string;
  status: RosterStatus;
  internalNotes: string;
  pricingNotes: string;
  lastContactedAt: string;
  tags: string;
};

const FILTER_STORAGE_KEY = "admin-roster-filters-v1";

const STATUS_STYLES: Record<RosterStatus, string> = {
  prospect: "bg-slate-100 text-slate-700 border-slate-300",
  contacted: "bg-blue-100 text-blue-700 border-blue-300",
  in_conversation: "bg-indigo-100 text-indigo-700 border-indigo-300",
  negotiating: "bg-amber-100 text-amber-700 border-amber-300",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  active: "bg-green-100 text-green-700 border-green-300",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-300",
  archived: "bg-rose-100 text-rose-700 border-rose-300",
};

const DEFAULT_FORM: RosterForm = {
  fullName: "",
  handle: "",
  platform: "instagram",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  pinterestUrl: "",
  otherProfileUrl: "",
  portfolioUrl: "",
  avatarUrl: "",
  email: "",
  phone: "",
  manager: "",
  creatorType: "influencer",
  influencerTier: "nano",
  niche: "",
  location: "",
  audienceNotes: "",
  followerCount: "",
  engagementRate: "",
  avgViews: "",
  contentStyleNotes: "",
  brandFitScore: "",
  totalRevenueGenerated: "",
  totalCampaigns: "",
  stripePayoutStatus: "not_connected",
  portalProfileUrl: "",
  status: "prospect",
  internalNotes: "",
  pricingNotes: "",
  lastContactedAt: "",
  tags: "",
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeExternalUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("www.")) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

type ProfileLinkKey = "instagram" | "tiktok" | "youtube" | "pinterest" | "other";
type ProfileLinkEntry = { platform: ProfileLinkKey; url: string };

function inferPlatformFromUrl(url: string): ProfileLinkKey {
  const lowered = url.toLowerCase();
  if (lowered.includes("instagram.com")) return "instagram";
  if (lowered.includes("tiktok.com")) return "tiktok";
  if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) return "youtube";
  if (lowered.includes("pinterest.com")) return "pinterest";
  return "other";
}

function parseProfileLinkEntries(raw: string | null | undefined): ProfileLinkEntry[] {
  if (!raw) return [];
  const entries: ProfileLinkEntry[] = [];
  const lines = raw.split(/[\n,|]+/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const pair = line.match(/^([a-z_]+)\s*:\s*(.+)$/i);
    const rawPlatform = pair?.[1]?.toLowerCase() ?? null;
    const rawUrl = pair?.[2] ?? line;
    const normalized = normalizeExternalUrl(rawUrl);
    if (!normalized) continue;

    const platform: ProfileLinkKey =
      rawPlatform === "instagram" ||
      rawPlatform === "tiktok" ||
      rawPlatform === "youtube" ||
      rawPlatform === "pinterest" ||
      rawPlatform === "other"
        ? rawPlatform
        : inferPlatformFromUrl(normalized);

    if (entries.some((entry) => entry.url === normalized)) continue;
    entries.push({ platform, url: normalized });
  }

  return entries;
}

function toProfileLinkMap(raw: string | null | undefined) {
  const map: Record<ProfileLinkKey, string> = {
    instagram: "",
    tiktok: "",
    youtube: "",
    pinterest: "",
    other: "",
  };

  const entries = parseProfileLinkEntries(raw);
  for (const entry of entries) {
    if (!map[entry.platform]) map[entry.platform] = entry.url;
    else if (entry.platform === "other") map.other = `${map.other}\n${entry.url}`.trim();
  }
  return map;
}

function composeProfileLinks(form: RosterForm) {
  const parts = [
    form.instagramUrl ? `instagram: ${form.instagramUrl}` : "",
    form.tiktokUrl ? `tiktok: ${form.tiktokUrl}` : "",
    form.youtubeUrl ? `youtube: ${form.youtubeUrl}` : "",
    form.pinterestUrl ? `pinterest: ${form.pinterestUrl}` : "",
    form.otherProfileUrl
      ? form.otherProfileUrl
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `other: ${line}`)
          .join("\n")
      : "",
  ].filter(Boolean);

  return parts.join("\n");
}

function toForm(profile?: InfluencerProfile | null): RosterForm {
  if (!profile) return DEFAULT_FORM;
  const links = toProfileLinkMap(profile.profileUrl);
  return {
    fullName: profile.fullName ?? "",
    handle: profile.handle ?? "",
    platform: profile.platform,
    instagramUrl: links.instagram,
    tiktokUrl: links.tiktok,
    youtubeUrl: links.youtube,
    pinterestUrl: links.pinterest,
    otherProfileUrl: links.other,
    portfolioUrl: profile.portfolioUrl ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    manager: profile.manager ?? "",
    creatorType: profile.creatorType ?? "influencer",
    influencerTier: profile.influencerTier,
    niche: profile.niche ?? "",
    location: profile.location ?? "",
    audienceNotes: profile.audienceNotes ?? "",
    followerCount: profile.followerCount ? String(profile.followerCount) : "",
    engagementRate: profile.engagementRate !== null ? String(profile.engagementRate) : "",
    avgViews: profile.avgViews !== null ? String(profile.avgViews) : "",
    contentStyleNotes: profile.contentStyleNotes ?? "",
    brandFitScore: profile.brandFitScore !== null ? String(profile.brandFitScore) : "",
    totalRevenueGenerated: String(profile.totalRevenueGenerated ?? 0),
    totalCampaigns: String(profile.totalCampaigns ?? 0),
    stripePayoutStatus: profile.stripePayoutStatus,
    portalProfileUrl: profile.portalProfileUrl ?? "",
    status: profile.status,
    internalNotes: profile.internalNotes ?? "",
    pricingNotes: profile.pricingNotes ?? "",
    lastContactedAt: profile.lastContactedAt ? profile.lastContactedAt.slice(0, 10) : "",
    tags: profile.tags.join(", "),
  };
}

function serializeForm(form: RosterForm) {
  const profileLinks = composeProfileLinks(form);
  return {
    fullName: form.fullName,
    handle: form.handle || null,
    platform: form.platform,
    profileUrl: profileLinks || null,
    portfolioUrl: form.portfolioUrl || null,
    avatarUrl: form.avatarUrl || null,
    email: form.email || null,
    phone: form.phone || null,
    manager: form.manager || null,
    creatorType: form.creatorType,
    influencerTier: form.influencerTier,
    niche: form.niche || null,
    location: form.location || null,
    audienceNotes: form.audienceNotes || null,
    followerCount: form.followerCount ? Number(form.followerCount) : 0,
    engagementRate: form.engagementRate ? Number(form.engagementRate) : null,
    avgViews: form.avgViews ? Number(form.avgViews) : null,
    contentStyleNotes: form.contentStyleNotes || null,
    brandFitScore: form.brandFitScore ? Number(form.brandFitScore) : null,
    totalRevenueGenerated: form.totalRevenueGenerated ? Number(form.totalRevenueGenerated) : 0,
    totalCampaigns: form.totalCampaigns ? Number(form.totalCampaigns) : 0,
    stripePayoutStatus: form.stripePayoutStatus,
    portalProfileUrl: form.portalProfileUrl || null,
    status: form.status,
    internalNotes: form.internalNotes || null,
    pricingNotes: form.pricingNotes || null,
    lastContactedAt: form.lastContactedAt || null,
    tags: parseTags(form.tags),
  };
}

function escapeCsvCell(value: string | number | null | undefined) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function splitCsvLine(line: string) {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((item) => item.trim());
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

function presetToColumnSort(sortBy: SortKey): ColumnSortState {
  if (sortBy === "name_asc") return { key: "fullName", direction: "asc" };
  if (sortBy === "follower_desc") return { key: "followerCount", direction: "desc" };
  if (sortBy === "engagement_desc") return { key: "engagementRate", direction: "desc" };
  return { key: "lastContactedAt", direction: "desc" };
}

function compareRows(a: InfluencerProfile, b: InfluencerProfile, sort: ColumnSortState) {
  const direction = sort.direction === "asc" ? 1 : -1;
  let result = 0;

  if (sort.key === "status") {
    result = ROSTER_STATUSES.indexOf(a.status) - ROSTER_STATUSES.indexOf(b.status);
    return result * direction;
  }

  if (sort.key === "followerCount") {
    result = (a.followerCount ?? 0) - (b.followerCount ?? 0);
    return result * direction;
  }

  if (sort.key === "engagementRate") {
    result = (Number(a.engagementRate) || 0) - (Number(b.engagementRate) || 0);
    return result * direction;
  }

  if (sort.key === "lastContactedAt") {
    const ad = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
    const bd = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
    result = ad - bd;
    return result * direction;
  }

  const av =
    sort.key === "tags"
      ? a.tags.join(", ")
      : (a[sort.key] ?? "").toString();
  const bv =
    sort.key === "tags"
      ? b.tags.join(", ")
      : (b[sort.key] ?? "").toString();
  return av.localeCompare(bv, undefined, { sensitivity: "base" }) * direction;
}

async function readErrorMessage(res: Response, fallback: string) {
  const raw = await res.text();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? raw;
  } catch {
    return raw;
  }
}

export function RosterClient({
  title = "Roster",
  subtitle = "influencer profiles",
}: RosterClientProps) {
  const [rows, setRows] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("contacted_desc");
  const [columnSort, setColumnSort] = useState<ColumnSortState>(presetToColumnSort("contacted_desc"));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InfluencerProfile | null>(null);
  const [form, setForm] = useState<RosterForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [profileUrlSelection, setProfileUrlSelection] = useState<Record<string, string>>({});
  const [instagramUrl, setInstagramUrl] = useState("");
  const [scrapingInstagram, setScrapingInstagram] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const availableTags = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => row.tags))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const availableLocations = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.location?.trim())
            .filter((loc): loc is string => Boolean(loc))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        query?: string;
        platformFilter?: string;
        statusFilter?: string;
        locationFilter?: string;
        tagFilter?: string;
        sortBy?: SortKey;
        columnSort?: ColumnSortState;
      };
      setQuery(parsed.query ?? "");
      setPlatformFilter(parsed.platformFilter ?? "all");
      setStatusFilter(parsed.statusFilter ?? "all");
      setLocationFilter(parsed.locationFilter ?? "all");
      setTagFilter(parsed.tagFilter ?? "all");
      const preset = parsed.sortBy ?? "contacted_desc";
      setSortBy(preset);
      if (
        parsed.columnSort &&
        typeof parsed.columnSort.key === "string" &&
        (parsed.columnSort.direction === "asc" || parsed.columnSort.direction === "desc")
      ) {
        setColumnSort(parsed.columnSort);
      } else {
        setColumnSort(presetToColumnSort(preset));
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify({
        query,
        platformFilter,
        statusFilter,
        locationFilter,
        tagFilter,
        sortBy,
        columnSort,
      })
    );
  }, [query, platformFilter, statusFilter, locationFilter, tagFilter, sortBy, columnSort]);

  async function loadRoster() {
    setLoading(true);
    try {
      const res = await fetch("/api/roster");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as InfluencerProfile[];
      setRows(data);
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/roster/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as DetailResponse;
      setDetail(data);
    } catch {
      toast.error("Failed to load influencer details");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadRoster();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const matchQuery =
        q.length === 0 ||
        row.fullName.toLowerCase().includes(q) ||
        (row.handle ?? "").toLowerCase().includes(q) ||
        (row.niche ?? "").toLowerCase().includes(q);
      const matchPlatform = platformFilter === "all" || row.platform === platformFilter;
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      const matchLocation = locationFilter === "all" || row.location === locationFilter;
      const matchTag = tagFilter === "all" || row.tags.includes(tagFilter);
      return matchQuery && matchPlatform && matchStatus && matchLocation && matchTag;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => compareRows(a, b, columnSort));
    return sorted;
  }, [rows, query, platformFilter, statusFilter, locationFilter, tagFilter, columnSort]);

  function toggleColumnSort(key: ColumnSortKey) {
    setColumnSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      const defaultDirection: SortDirection =
        key === "followerCount" || key === "engagementRate" || key === "lastContactedAt"
          ? "desc"
          : "asc";
      return { key, direction: defaultDirection };
    });
  }

  function sortIndicator(key: ColumnSortKey) {
    if (columnSort.key !== key) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return <span className="text-xs">{columnSort.direction === "asc" ? "▲" : "▼"}</span>;
  }

  function beginCellEdit(rowId: string, field: string, value: string) {
    setEditingCell({ rowId, field });
    setEditingValue(value);
  }

  function cancelCellEdit() {
    setEditingCell(null);
    setEditingValue("");
  }

  function toNullableText(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  function extractProfileUrls(raw: string | null | undefined) {
    return parseProfileLinkEntries(raw).map((entry) => entry.url);
  }

  function openExternalUrl(raw: string) {
    const normalized = normalizeExternalUrl(raw);
    if (!normalized) return;
    window.open(normalized, "_blank", "noopener,noreferrer");
  }

  async function saveInlineCell(row: InfluencerProfile, field: string, rawValue: string) {
    if (inlineSaving) return;

    const value = rawValue.trim();
    const payload: Record<string, unknown> = {};

    if (field === "fullName") {
      if (!value) {
        toast.error("Name cannot be empty");
        return;
      }
      payload.fullName = value;
    }
    if (field === "handle") payload.handle = toNullableText(value);
    if (field === "platform") payload.platform = value;
    if (field === "profileUrl") payload.profileUrl = toNullableText(value);
    if (field === "portfolioUrl") payload.portfolioUrl = toNullableText(value);
    if (field === "niche") payload.niche = toNullableText(value);
    if (field === "location") payload.location = toNullableText(value);
    if (field === "followerCount") payload.followerCount = value ? Number(value) : 0;
    if (field === "engagementRate") payload.engagementRate = value ? Number(value) : null;
    if (field === "email") payload.email = toNullableText(value);
    if (field === "manager") payload.manager = toNullableText(value);
    if (field === "status") payload.status = value;
    if (field === "internalNotes") payload.internalNotes = toNullableText(value);
    if (field === "lastContactedAt") payload.lastContactedAt = value || null;
    if (field === "tags") payload.tags = parseTags(value);

    setInlineSaving(true);
    try {
      const res = await fetch(`/api/roster/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, "Failed to update influencer");
        throw new Error(message);
      }
      const updated = (await res.json()) as InfluencerProfile;
      setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      if (selectedId === row.id) await loadDetail(row.id);
      cancelCellEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update influencer";
      toast.error(message);
    } finally {
      setInlineSaving(false);
    }
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(row: InfluencerProfile) {
    setEditing(row);
    setForm(toForm(row));
    setDialogOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = serializeForm(form);
      const res = await fetch(editing ? `/api/roster/${editing.id}` : "/api/roster", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await readErrorMessage(
          res,
          editing ? "Failed to update influencer" : "Failed to add influencer"
        );
        throw new Error(message);
      }
      toast.success(editing ? "Influencer updated" : "Influencer added");
      setDialogOpen(false);
      await loadRoster();
      if (selectedId) await loadDetail(selectedId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editing
            ? "Failed to update influencer"
            : "Failed to add influencer";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(row: InfluencerProfile, status: RosterStatus) {
    try {
      const res = await fetch(`/api/roster/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          activityNote: `Status changed to ${titleCase(status)}`,
          activityType: "status_change",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status } : item)));
      if (selectedId === row.id) await loadDetail(row.id);
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function quickAddNote(row: InfluencerProfile) {
    const note = window.prompt(`Add activity note for ${row.fullName}`);
    if (!note?.trim()) return;
    try {
      const res = await fetch(`/api/roster/${row.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, type: "note" }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Note added");
      if (selectedId === row.id) await loadDetail(row.id);
    } catch {
      toast.error("Failed to add note");
    }
  }

  async function deleteInfluencer(row: InfluencerProfile) {
    const confirmed = window.confirm(
      `Delete ${row.fullName} from roster? This permanently removes the profile.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/roster/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      if (selectedId === row.id) setSelectedId(null);
      toast.success("Influencer deleted");
    } catch {
      toast.error("Failed to delete influencer");
    }
  }

  function exportCsv() {
    const headers = [
      "full_name",
      "handle",
      "platform",
      "profile_url",
      "portfolio_url",
      "avatar_url",
      "niche",
      "location",
      "follower_count",
      "engagement_rate",
      "email",
      "manager",
      "creator_type",
      "influencer_tier",
      "status",
      "total_revenue_generated",
      "total_campaigns",
      "stripe_payout_status",
      "portal_profile_url",
      "last_contacted",
      "tags",
      "notes",
    ];
    const lines = [headers.join(",")];
    filteredRows.forEach((row) => {
      lines.push(
        [
          row.fullName,
          row.handle,
          row.platform,
          row.profileUrl,
          row.portfolioUrl,
          row.avatarUrl,
          row.niche,
          row.location,
          row.followerCount,
          row.engagementRate,
          row.email,
          row.manager,
          row.creatorType,
          row.influencerTier,
          row.status,
          row.totalRevenueGenerated,
          row.totalCampaigns,
          row.stripePayoutStatus,
          row.portalProfileUrl,
          row.lastContactedAt ? row.lastContactedAt.slice(0, 10) : "",
          row.tags.join("|"),
          row.internalNotes,
        ]
          .map(escapeCsvCell)
          .join(",")
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `influencer-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("CSV appears empty");
        return;
      }

      const jobs = parsed.map(async (row) => {
        const tags = (row.tags || row.labels || "")
          .split(/[|,]/)
          .map((tag) => tag.trim())
          .filter(Boolean);
        const payload = {
          fullName: row.full_name || row.name || row.fullname,
          handle: row.handle || row.username,
          platform: (row.platform || "instagram").toLowerCase(),
          profileUrl: row.profile_url || row.profilelink,
          portfolioUrl: row.portfolio_url || row.portfolio || row.website || row.site_url || null,
          avatarUrl: row.avatar_url || null,
          email: row.email,
          manager: row.manager || row.agency,
          creatorType: (row.creator_type || row.creator || "influencer").toLowerCase(),
          influencerTier: (row.influencer_tier || row.tier || "nano").toLowerCase(),
          niche: row.niche || row.category,
          location: row.location,
          followerCount: row.follower_count || row.followers || 0,
          engagementRate: row.engagement_rate || row.er || null,
          avgViews: row.avg_views || row.average_views || null,
          status: (row.status || "prospect").toLowerCase().replace(" ", "_"),
          totalRevenueGenerated: row.total_revenue_generated || row.revenue || 0,
          totalCampaigns: row.total_campaigns || 0,
          stripePayoutStatus: (row.stripe_payout_status || "not_connected").toLowerCase(),
          portalProfileUrl: row.portal_profile_url || null,
          tags,
          internalNotes: row.notes || row.internal_notes || null,
          lastContactedAt: row.last_contacted || null,
        };
        if (!payload.fullName) return;
        await fetch("/api/roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      });

      await Promise.all(jobs);
      toast.success(`Imported ${parsed.length} influencer profiles`);
      await loadRoster();
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  }

  async function submitNote() {
    if (!selectedId || !newNote.trim()) return;
    try {
      const res = await fetch(`/api/roster/${selectedId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote, type: "note" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewNote("");
      await loadDetail(selectedId);
      toast.success("Activity logged");
    } catch {
      toast.error("Failed to log activity");
    }
  }

  async function quickAddFromInstagram() {
    if (!instagramUrl.trim()) {
      toast.error("Paste an Instagram URL first");
      return;
    }

    setScrapingInstagram(true);
    try {
      const res = await fetch("/api/instagram/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: instagramUrl.trim() }),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, "Could not scrape Instagram profile");
        throw new Error(message);
      }
      const data = (await res.json()) as {
        username: string;
        name: string | null;
        avatarUrl: string | null;
        bio: string | null;
        followerCount: number | null;
        scraped?: boolean;
      };

      setEditing(null);
      setForm({
        ...DEFAULT_FORM,
        fullName: data.name ?? data.username,
        handle: data.username,
        platform: "instagram",
        instagramUrl: `https://www.instagram.com/${data.username}/`,
        avatarUrl: data.avatarUrl ?? "",
        followerCount: data.followerCount ? String(data.followerCount) : "",
        audienceNotes: data.bio ?? "",
      });
      setDialogOpen(true);
      if (data.scraped) {
        toast.success("Instagram profile scraped. Fill the rest and save.");
      } else {
        toast.warning("Profile found, but Instagram blocked full stats. You can fill details manually.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not scrape Instagram profile";
      toast.error(message);
    } finally {
      setScrapingInstagram(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">
            {rows.length} {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="Paste Instagram URL..."
            className="w-[260px]"
          />
          <Button variant="outline" onClick={quickAddFromInstagram} disabled={scrapingInstagram}>
            {scrapingInstagram ? "Scraping..." : "Add from Instagram URL"}
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={onImportCsv} />
          <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="gap-2">
            <FileUp className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Add Influencer
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="lg:col-span-2 relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search name, handle, niche..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {ROSTER_PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {titleCase(platform)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ROSTER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {titleCase(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(value) => {
                const preset = value as SortKey;
                setSortBy(preset);
                setColumnSort(presetToColumnSort(preset));
              }}
            >
              <SelectTrigger className="w-full">
                <ArrowUpDown className="h-4 w-4 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contacted_desc">Sort by last contacted</SelectItem>
                <SelectItem value="follower_desc">Sort by follower count</SelectItem>
                <SelectItem value="engagement_desc">Sort by engagement rate</SelectItem>
                <SelectItem value="name_asc">Sort alphabetically</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {availableLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm py-3">
        <CardContent className="px-0">
          {loading ? (
            <p className="px-6 py-8 text-sm text-gray-500">Loading roster...</p>
          ) : filteredRows.length === 0 ? (
            <div className="px-6">
              <EmptyState
                icon={Users}
                title="No influencer profiles found"
                description="Adjust your filters or add a new influencer profile."
                action={
                  <Button className="bg-rose-600 hover:bg-rose-700" onClick={openCreateDialog}>
                    Add Influencer
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("fullName")}>
                        Name {sortIndicator("fullName")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("handle")}>
                        Handle {sortIndicator("handle")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("platform")}>
                        Platform {sortIndicator("platform")}
                      </button>
                    </TableHead>
                    <TableHead>Creator Type</TableHead>
                    <TableHead>Profile URL</TableHead>
                    <TableHead>Portfolio</TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("niche")}>
                        Niche {sortIndicator("niche")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("location")}>
                        Location {sortIndicator("location")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("followerCount")}>
                        Followers {sortIndicator("followerCount")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("engagementRate")}>
                        Engagement {sortIndicator("engagementRate")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("email")}>
                        Email {sortIndicator("email")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("manager")}>
                        Manager {sortIndicator("manager")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("status")}>
                        Status {sortIndicator("status")}
                      </button>
                    </TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("lastContactedAt")}>
                        Last Contacted {sortIndicator("lastContactedAt")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1 hover:text-rose-700" onClick={() => toggleColumnSort("tags")}>
                        Tags {sortIndicator("tags")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Quick Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={row.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {row.fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {editingCell?.rowId === row.id && editingCell.field === "fullName" ? (
                            <Input
                              autoFocus
                              className="h-8 w-[180px]"
                              value={editingValue}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => void saveInlineCell(row, "fullName", editingValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveInlineCell(row, "fullName", editingValue);
                                if (e.key === "Escape") cancelCellEdit();
                              }}
                            />
                          ) : (
                            <button
                              className="font-medium text-left hover:text-rose-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                beginCellEdit(row.id, "fullName", row.fullName);
                              }}
                            >
                              {row.fullName}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "handle" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[140px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "handle", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "handle", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "handle", row.handle ?? "");
                            }}
                          >
                            {row.handle ? `@${row.handle.replace(/^@/, "")}` : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "platform" ? (
                          <Select
                            value={editingValue || row.platform}
                            onValueChange={(value) => void saveInlineCell(row, "platform", value)}
                          >
                            <SelectTrigger className="h-8 w-[130px]" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROSTER_PLATFORMS.map((platform) => (
                                <SelectItem key={`${row.id}-platform-${platform}`} value={platform}>
                                  {titleCase(platform)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "platform", row.platform);
                            }}
                          >
                            {titleCase(row.platform)}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {row.creatorType === "ugc_creator" ? "UGC Creator" : "Influencer"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const linkEntries = parseProfileLinkEntries(row.profileUrl);
                          if (linkEntries.length === 0) return <span>-</span>;
                          return (
                            <Select
                              value={profileUrlSelection[row.id] ?? ""}
                              onValueChange={(value) => {
                                setProfileUrlSelection((prev) => ({ ...prev, [row.id]: value }));
                                openExternalUrl(value);
                                setProfileUrlSelection((prev) => ({ ...prev, [row.id]: "" }));
                              }}
                            >
                              <SelectTrigger className="h-8 w-[190px] text-xs" onClick={(e) => e.stopPropagation()}>
                                <SelectValue placeholder={`Open (${linkEntries.length})`} />
                              </SelectTrigger>
                              <SelectContent onClick={(e) => e.stopPropagation()}>
                                {linkEntries.map((entry, idx) => (
                                  <SelectItem key={`${row.id}-profile-url-${idx}`} value={entry.url}>
                                    {`${titleCase(entry.platform)} - ${entry.url.replace(/^https?:\/\//i, "")}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "portfolioUrl" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[220px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "portfolioUrl", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "portfolioUrl", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          row.portfolioUrl ? (
                            <button
                              className="text-left text-rose-600 hover:text-rose-700 text-xs underline underline-offset-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                openExternalUrl(row.portfolioUrl ?? "");
                              }}
                            >
                              Open
                            </button>
                          ) : (
                            <span>-</span>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "niche" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[120px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "niche", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "niche", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "niche", row.niche ?? "");
                            }}
                          >
                            {row.niche ?? "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "location" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[120px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "location", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "location", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "location", row.location ?? "");
                            }}
                          >
                            {row.location ?? "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "followerCount" ? (
                          <Input
                            autoFocus
                            type="number"
                            className="h-8 w-[100px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "followerCount", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "followerCount", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "followerCount", String(row.followerCount ?? 0));
                            }}
                          >
                            {row.followerCount ? row.followerCount.toLocaleString() : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "engagementRate" ? (
                          <Input
                            autoFocus
                            type="number"
                            step="0.01"
                            className="h-8 w-[95px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "engagementRate", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "engagementRate", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(
                                row.id,
                                "engagementRate",
                                row.engagementRate !== null ? String(row.engagementRate) : ""
                              );
                            }}
                          >
                            {row.engagementRate !== null ? `${row.engagementRate}%` : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {editingCell?.rowId === row.id && editingCell.field === "email" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[170px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "email", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "email", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "email", row.email ?? "");
                            }}
                          >
                            {row.email ?? "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "manager" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[130px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "manager", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "manager", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "manager", row.manager ?? "");
                            }}
                          >
                            {row.manager ?? "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "status" ? (
                          <Select
                            value={editingValue || row.status}
                            onValueChange={(value) => void saveInlineCell(row, "status", value)}
                          >
                            <SelectTrigger className="h-8 w-[135px]" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROSTER_STATUSES.map((status) => (
                                <SelectItem key={`${row.id}-status-${status}`} value={status}>
                                  {titleCase(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "status", row.status);
                            }}
                          >
                            <Badge variant="outline" className={STATUS_STYLES[row.status]}>
                              {titleCase(row.status)}
                            </Badge>
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {editingCell?.rowId === row.id && editingCell.field === "internalNotes" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[170px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "internalNotes", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "internalNotes", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "internalNotes", row.internalNotes ?? "");
                            }}
                          >
                            {row.internalNotes ?? "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.rowId === row.id && editingCell.field === "lastContactedAt" ? (
                          <Input
                            autoFocus
                            type="date"
                            className="h-8 w-[150px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "lastContactedAt", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "lastContactedAt", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(
                                row.id,
                                "lastContactedAt",
                                row.lastContactedAt ? row.lastContactedAt.slice(0, 10) : ""
                              );
                            }}
                          >
                            {row.lastContactedAt ? format(new Date(row.lastContactedAt), "MMM d, yyyy") : "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {editingCell?.rowId === row.id && editingCell.field === "tags" ? (
                          <Input
                            autoFocus
                            className="h-8 w-[170px]"
                            value={editingValue}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => void saveInlineCell(row, "tags", editingValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveInlineCell(row, "tags", editingValue);
                              if (e.key === "Escape") cancelCellEdit();
                            }}
                          />
                        ) : (
                          <button
                            className="text-left hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              beginCellEdit(row.id, "tags", row.tags.join(", "));
                            }}
                          >
                            <div className="flex flex-wrap gap-1">
                              {row.tags.length === 0 ? (
                                <span>-</span>
                              ) : (
                                row.tags.slice(0, 2).map((tag) => (
                                  <Badge key={`${row.id}-${tag}`} variant="outline" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))
                              )}
                              {row.tags.length > 2 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{row.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Select value={row.status} onValueChange={(value) => updateStatus(row, value as RosterStatus)}>
                            <SelectTrigger className="h-8 w-[138px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROSTER_STATUSES.map((status) => (
                                <SelectItem key={`${row.id}-${status}`} value={status}>
                                  {titleCase(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" onClick={() => openEditDialog(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => quickAddNote(row)}>
                            <NotebookPen className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (!row.email) return;
                              navigator.clipboard.writeText(row.email);
                              toast.success("Email copied");
                            }}
                            disabled={!row.email}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const firstUrl = extractProfileUrls(row.profileUrl)[0];
                              if (!firstUrl) return;
                              openExternalUrl(firstUrl);
                            }}
                            disabled={extractProfileUrls(row.profileUrl).length === 0}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteInfluencer(row)}>
                            <Trash2 className="h-4 w-4 text-rose-700" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Influencer" : "Add Influencer"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 max-h-[70vh] overflow-y-auto pr-1" onSubmit={submitForm}>
            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Basic Profile</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Social Handle</Label>
                  <Input value={form.handle} onChange={(e) => setForm((prev) => ({ ...prev, handle: e.target.value }))} />
                </div>
                <div>
                  <Label>Creator Type</Label>
                  <Select
                    value={form.creatorType}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, creatorType: value as CreatorType }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATOR_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "ugc_creator" ? "UGC Creator" : "Influencer"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Avatar URL</Label>
                  <Input
                    value={form.avatarUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={form.avatarUrl || undefined} />
                      <AvatarFallback>{(form.fullName || "IN").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500">Profile photo preview</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Links & Platforms</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Primary Platform</Label>
                  <Select
                    value={form.platform}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, platform: value as RosterPlatform }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROSTER_PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {titleCase(platform)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Portfolio URL</Label>
                  <Input
                    value={form.portfolioUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Instagram URL</Label>
                  <Input
                    value={form.instagramUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>TikTok URL</Label>
                  <Input
                    value={form.tiktokUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>YouTube URL</Label>
                  <Input
                    value={form.youtubeUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Pinterest URL</Label>
                  <Input
                    value={form.pinterestUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, pinterestUrl: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Other Profile URLs (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={form.otherProfileUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, otherProfileUrl: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact & Representation</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone (optional)</Label>
                  <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Manager / Representation</Label>
                  <Input
                    value={form.manager}
                    onChange={(e) => setForm((prev) => ({ ...prev, manager: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Niche / Category</Label>
                  <Input value={form.niche} onChange={(e) => setForm((prev) => ({ ...prev, niche: e.target.value }))} />
                </div>
                <div>
                  <Label>Influencer Tier</Label>
                  <Select
                    value={form.influencerTier}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, influencerTier: value as InfluencerTier }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INFLUENCER_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {titleCase(tier)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Performance Metrics</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Follower Count</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.followerCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, followerCount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Engagement Rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.engagementRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, engagementRate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Average Views / Reach</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.avgViews}
                    onChange={(e) => setForm((prev) => ({ ...prev, avgViews: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Brand Fit Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.brandFitScore}
                    onChange={(e) => setForm((prev) => ({ ...prev, brandFitScore: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Total Revenue Generated</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.totalRevenueGenerated}
                    onChange={(e) => setForm((prev) => ({ ...prev, totalRevenueGenerated: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Total Campaigns</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.totalCampaigns}
                    onChange={(e) => setForm((prev) => ({ ...prev, totalCampaigns: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Administrative</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as RosterStatus }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROSTER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {titleCase(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stripe Payout Status</Label>
                  <Select
                    value={form.stripePayoutStatus}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, stripePayoutStatus: value as StripePayoutStatus }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STRIPE_PAYOUT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {titleCase(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Portal Profile URL</Label>
                  <Input
                    value={form.portalProfileUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, portalProfileUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Last Contacted Date</Label>
                  <Input
                    type="date"
                    value={form.lastContactedAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastContactedAt: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Audience Notes</Label>
                  <Textarea
                    value={form.audienceNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, audienceNotes: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Content Style Notes</Label>
                  <Textarea
                    value={form.contentStyleNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, contentStyleNotes: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Pricing / Rate Notes</Label>
                  <Textarea
                    value={form.pricingNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, pricingNotes: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={form.internalNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Influencer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="border-b border-gray-100">
            <SheetTitle>
              {detail?.profile.fullName ?? (detailLoading ? "Loading..." : "Influencer Profile")}
            </SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <p className="p-4 text-sm text-gray-500">Loading profile...</p>
          ) : detail ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={detail.profile.avatarUrl ?? undefined} />
                  <AvatarFallback>{detail.profile.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{detail.profile.fullName}</p>
                  <p className="text-xs text-gray-500">
                    {detail.profile.handle ? `@${detail.profile.handle}` : "No handle"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Handle</p>
                  <p>{detail.profile.handle ? `@${detail.profile.handle}` : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Platform</p>
                  <p>{titleCase(detail.profile.platform)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Portfolio</p>
                  {detail.profile.portfolioUrl ? (
                    <a
                      href={detail.profile.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-600 hover:text-rose-700 underline underline-offset-2"
                    >
                      Open portfolio
                    </a>
                  ) : (
                    <p>-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p>{detail.profile.email ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p>{detail.profile.phone ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Manager</p>
                  <p>{detail.profile.manager ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p>{detail.profile.location ?? "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Card className="py-3">
                  <CardContent className="px-4">
                    <p className="text-xs text-gray-400">Followers</p>
                    <p className="font-semibold">{detail.profile.followerCount.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="py-3">
                  <CardContent className="px-4">
                    <p className="text-xs text-gray-400">Engagement</p>
                    <p className="font-semibold">
                      {detail.profile.engagementRate !== null ? `${detail.profile.engagementRate}%` : "-"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="py-3">
                  <CardContent className="px-4">
                    <p className="text-xs text-gray-400">Avg Views</p>
                    <p className="font-semibold">
                      {detail.profile.avgViews ? detail.profile.avgViews.toLocaleString() : "-"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="py-4">
                <CardHeader>
                  <CardTitle className="text-sm">Brand Fit + Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">Influencer tier:</span>{" "}
                    {titleCase(detail.profile.influencerTier)}
                  </p>
                  <p>
                    <span className="text-gray-500">Brand fit score:</span>{" "}
                    {detail.profile.brandFitScore ?? "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">Total revenue generated:</span>{" "}
                    ${Number(detail.profile.totalRevenueGenerated ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p>
                    <span className="text-gray-500">Total campaigns:</span>{" "}
                    {detail.profile.totalCampaigns ?? 0}
                  </p>
                  <p>
                    <span className="text-gray-500">Stripe payout status:</span>{" "}
                    {titleCase(detail.profile.stripePayoutStatus)}
                  </p>
                  <p>
                    <span className="text-gray-500">Portal profile URL:</span>{" "}
                    {detail.profile.portalProfileUrl ? (
                      <a
                        href={detail.profile.portalProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-600 hover:text-rose-700 underline underline-offset-2"
                      >
                        Open profile
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                  <p>
                    <span className="text-gray-500">Audience notes:</span>{" "}
                    {detail.profile.audienceNotes ?? "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">Content style notes:</span>{" "}
                    {detail.profile.contentStyleNotes ?? "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">Pricing / rate notes:</span>{" "}
                    {detail.profile.pricingNotes ?? "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">Internal notes:</span>{" "}
                    {detail.profile.internalNotes ?? "-"}
                  </p>
                </CardContent>
              </Card>

              <Card className="py-4">
                <CardHeader>
                  <CardTitle className="text-sm">Campaign & Deliverables History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Campaign history</p>
                    {detail.profile.campaignHistory.length === 0 ? (
                      <p className="text-sm text-gray-500">No campaign history yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {detail.profile.campaignHistory.map((item) => (
                          <li key={`${item.date}-${item.title}`} className="text-sm">
                            {item.date}: {item.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Deliverables completed</p>
                    {detail.profile.deliverablesCompleted.length === 0 ? (
                      <p className="text-sm text-gray-500">No deliverables logged yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {detail.profile.deliverablesCompleted.map((item) => (
                          <li key={`${item.date}-${item.title}`} className="text-sm">
                            {item.date}: {item.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Last updated: {format(new Date(detail.profile.updatedAt), "MMM d, yyyy h:mm a")}
                  </p>
                </CardContent>
              </Card>

              <Card className="py-4">
                <CardHeader>
                  <CardTitle className="text-sm">Activity Log</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Sent outreach email, followed up, received rate card..."
                    />
                    <Button onClick={submitNote}>Add Note</Button>
                  </div>
                  <div className="space-y-2">
                    {detail.activities.length === 0 ? (
                      <p className="text-sm text-gray-500">No activity yet.</p>
                    ) : (
                      detail.activities.map((activity) => (
                        <div key={activity.id} className="rounded-md border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline">{titleCase(activity.type)}</Badge>
                            <span className="text-xs text-gray-400">
                              {format(new Date(activity.createdAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm mt-2">{activity.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="p-4 text-sm text-gray-500">Select an influencer to view details.</p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
