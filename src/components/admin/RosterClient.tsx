"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  Archive,
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
  ROSTER_PLATFORMS,
  ROSTER_STATUSES,
  type InfluencerProfile,
  type RosterActivity,
  type RosterPlatform,
  type RosterStatus,
} from "@/types/roster";

type DetailResponse = {
  profile: InfluencerProfile;
  activities: RosterActivity[];
};

type SortKey = "name_asc" | "follower_desc" | "engagement_desc" | "contacted_desc";

type RosterForm = {
  fullName: string;
  handle: string;
  platform: RosterPlatform;
  profileUrl: string;
  email: string;
  phone: string;
  manager: string;
  niche: string;
  location: string;
  audienceNotes: string;
  followerCount: string;
  engagementRate: string;
  avgViews: string;
  contentStyleNotes: string;
  brandFitScore: string;
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
  profileUrl: "",
  email: "",
  phone: "",
  manager: "",
  niche: "",
  location: "",
  audienceNotes: "",
  followerCount: "",
  engagementRate: "",
  avgViews: "",
  contentStyleNotes: "",
  brandFitScore: "",
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

function toForm(profile?: InfluencerProfile | null): RosterForm {
  if (!profile) return DEFAULT_FORM;
  return {
    fullName: profile.fullName ?? "",
    handle: profile.handle ?? "",
    platform: profile.platform,
    profileUrl: profile.profileUrl ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    manager: profile.manager ?? "",
    niche: profile.niche ?? "",
    location: profile.location ?? "",
    audienceNotes: profile.audienceNotes ?? "",
    followerCount: profile.followerCount ? String(profile.followerCount) : "",
    engagementRate: profile.engagementRate !== null ? String(profile.engagementRate) : "",
    avgViews: profile.avgViews !== null ? String(profile.avgViews) : "",
    contentStyleNotes: profile.contentStyleNotes ?? "",
    brandFitScore: profile.brandFitScore !== null ? String(profile.brandFitScore) : "",
    status: profile.status,
    internalNotes: profile.internalNotes ?? "",
    pricingNotes: profile.pricingNotes ?? "",
    lastContactedAt: profile.lastContactedAt ? profile.lastContactedAt.slice(0, 10) : "",
    tags: profile.tags.join(", "),
  };
}

function serializeForm(form: RosterForm) {
  return {
    fullName: form.fullName,
    handle: form.handle || null,
    platform: form.platform,
    profileUrl: form.profileUrl || null,
    email: form.email || null,
    phone: form.phone || null,
    manager: form.manager || null,
    niche: form.niche || null,
    location: form.location || null,
    audienceNotes: form.audienceNotes || null,
    followerCount: form.followerCount ? Number(form.followerCount) : 0,
    engagementRate: form.engagementRate ? Number(form.engagementRate) : null,
    avgViews: form.avgViews ? Number(form.avgViews) : null,
    contentStyleNotes: form.contentStyleNotes || null,
    brandFitScore: form.brandFitScore ? Number(form.brandFitScore) : null,
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

export function RosterClient() {
  const [rows, setRows] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("contacted_desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InfluencerProfile | null>(null);
  const [form, setForm] = useState<RosterForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
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
      };
      setQuery(parsed.query ?? "");
      setPlatformFilter(parsed.platformFilter ?? "all");
      setStatusFilter(parsed.statusFilter ?? "all");
      setLocationFilter(parsed.locationFilter ?? "all");
      setTagFilter(parsed.tagFilter ?? "all");
      setSortBy(parsed.sortBy ?? "contacted_desc");
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
      })
    );
  }, [query, platformFilter, statusFilter, locationFilter, tagFilter, sortBy]);

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
    sorted.sort((a, b) => {
      if (sortBy === "name_asc") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "follower_desc") return (b.followerCount ?? 0) - (a.followerCount ?? 0);
      if (sortBy === "engagement_desc") return (Number(b.engagementRate) || 0) - (Number(a.engagementRate) || 0);
      const ad = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const bd = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      return bd - ad;
    });
    return sorted;
  }, [rows, query, platformFilter, statusFilter, locationFilter, tagFilter, sortBy]);

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
      if (!res.ok) throw new Error(await res.text());
      toast.success(editing ? "Influencer updated" : "Influencer added");
      setDialogOpen(false);
      await loadRoster();
      if (selectedId) await loadDetail(selectedId);
    } catch {
      toast.error(editing ? "Failed to update influencer" : "Failed to add influencer");
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

  async function archiveInfluencer(row: InfluencerProfile) {
    try {
      const res = await fetch(`/api/roster/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: "archived" } : item)));
      if (selectedId === row.id) await loadDetail(row.id);
      toast.success("Influencer archived");
    } catch {
      toast.error("Failed to archive influencer");
    }
  }

  function exportCsv() {
    const headers = [
      "full_name",
      "handle",
      "platform",
      "profile_url",
      "niche",
      "location",
      "follower_count",
      "engagement_rate",
      "email",
      "manager",
      "status",
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
          row.niche,
          row.location,
          row.followerCount,
          row.engagementRate,
          row.email,
          row.manager,
          row.status,
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
          email: row.email,
          manager: row.manager || row.agency,
          niche: row.niche || row.category,
          location: row.location,
          followerCount: row.follower_count || row.followers || 0,
          engagementRate: row.engagement_rate || row.er || null,
          avgViews: row.avg_views || row.average_views || null,
          status: (row.status || "prospect").toLowerCase().replace(" ", "_"),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster</h1>
          <p className="text-sm text-gray-500">{rows.length} influencer profiles</p>
        </div>
        <div className="flex items-center gap-2">
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
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Handle</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Profile URL</TableHead>
                    <TableHead>Niche</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Followers</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Last Contacted</TableHead>
                    <TableHead>Tags</TableHead>
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
                      <TableCell className="font-medium">{row.fullName}</TableCell>
                      <TableCell>{row.handle ? `@${row.handle.replace(/^@/, "")}` : "-"}</TableCell>
                      <TableCell>{titleCase(row.platform)}</TableCell>
                      <TableCell>
                        {row.profileUrl ? (
                          <Link
                            href={row.profileUrl}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="text-rose-600 hover:text-rose-700 text-xs underline underline-offset-2"
                          >
                            Open
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{row.niche ?? "-"}</TableCell>
                      <TableCell>{row.location ?? "-"}</TableCell>
                      <TableCell>{row.followerCount ? row.followerCount.toLocaleString() : "-"}</TableCell>
                      <TableCell>{row.engagementRate !== null ? `${row.engagementRate}%` : "-"}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{row.email ?? "-"}</TableCell>
                      <TableCell>{row.manager ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[row.status]}>
                          {titleCase(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{row.internalNotes ?? "-"}</TableCell>
                      <TableCell>
                        {row.lastContactedAt ? format(new Date(row.lastContactedAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {row.tags.slice(0, 2).map((tag) => (
                            <Badge key={`${row.id}-${tag}`} variant="outline" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                          {row.tags.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{row.tags.length - 2}
                            </Badge>
                          )}
                        </div>
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
                            onClick={() => row.profileUrl && window.open(row.profileUrl, "_blank")}
                            disabled={!row.profileUrl}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => archiveInfluencer(row)}>
                            <Archive className="h-4 w-4 text-rose-700" />
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
                <Label>Platform</Label>
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
                <Label>Profile Link</Label>
                <Input
                  value={form.profileUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, profileUrl: e.target.value }))}
                />
              </div>
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
                <Label>Niche / Category</Label>
                <Input value={form.niche} onChange={(e) => setForm((prev) => ({ ...prev, niche: e.target.value }))} />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>
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
                <Label>Last Contacted Date</Label>
                <Input
                  type="date"
                  value={form.lastContactedAt}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastContactedAt: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Audience Notes</Label>
              <Textarea
                value={form.audienceNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, audienceNotes: e.target.value }))}
              />
            </div>
            <div>
              <Label>Content Style Notes</Label>
              <Textarea
                value={form.contentStyleNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, contentStyleNotes: e.target.value }))}
              />
            </div>
            <div>
              <Label>Pricing / Rate Notes</Label>
              <Textarea
                value={form.pricingNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, pricingNotes: e.target.value }))}
              />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={form.internalNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
              />
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
                    <span className="text-gray-500">Brand fit score:</span>{" "}
                    {detail.profile.brandFitScore ?? "-"}
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
