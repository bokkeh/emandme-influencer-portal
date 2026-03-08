"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TeamMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "influencer" | "ugc_creator";
  isActive: boolean;
  createdAt: string;
};

function displayName(member: TeamMember) {
  const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  return name || member.email;
}

export function TeamManagementClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/team");
        if (!res.ok) throw new Error((await res.text()) || "Failed to load team");
        const data = (await res.json()) as { users: TeamMember[] };
        setMembers(data.users);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load team";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [displayName(m), m.email, m.role].join(" ").toLowerCase().includes(q)
    );
  }, [members, query]);

  async function updateMember(
    id: string,
    patch: Partial<Pick<TeamMember, "role" | "isActive">>,
    successMessage: string
  ) {
    setSavingById((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update team member");
      const updated = (await res.json()) as TeamMember;
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      toast.success(successMessage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update team member";
      toast.error(message);
    } finally {
      setSavingById((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Team Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search name, email, or role..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading ? (
          <p className="text-sm text-gray-500">Loading team...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No matching team members.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((member) => {
              const saving = Boolean(savingById[member.id]);
              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{displayName(member)}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-700">{member.role}</Badge>
                      {!member.isActive ? (
                        <Badge className="bg-amber-100 text-amber-700">Inactive</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[170px]">
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          void updateMember(
                            member.id,
                            {
                              role: value as TeamMember["role"],
                            },
                            `Updated ${displayName(member)} role`
                          )
                        }
                        disabled={saving}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="influencer">Influencer</SelectItem>
                          <SelectItem value="ugc_creator">UGC Creator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={member.isActive}
                        onCheckedChange={(checked) =>
                          void updateMember(
                            member.id,
                            { isActive: checked },
                            `${checked ? "Activated" : "Deactivated"} ${displayName(member)}`
                          )
                        }
                        disabled={saving}
                        aria-label={`Set active for ${displayName(member)}`}
                      />
                      <span className="text-xs text-gray-600">Active</span>
                    </div>

                    {member.role !== "admin" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        disabled={saving}
                        onClick={() =>
                          void updateMember(
                            member.id,
                            { role: "admin" },
                            `${displayName(member)} is now an admin`
                          )
                        }
                      >
                        Make Admin
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

