"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  avatarUrl: string | null;
  role: "admin" | "influencer" | "ugc_creator" | "affiliate" | "test_account";
  isActive: boolean;
  createdAt: string;
};

type NewUserRole = TeamMember["role"];

function displayName(member: TeamMember) {
  const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
  return name || member.email;
}

function initials(member: TeamMember) {
  const fromName = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.toUpperCase();
  if (fromName) return fromName;
  return member.email.slice(0, 2).toUpperCase();
}

export function TeamManagementClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newMember, setNewMember] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "influencer" as NewUserRole,
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword: string;
    role: NewUserRole;
  } | null>(null);

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

  async function createMember() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });

      if (!res.ok) throw new Error((await res.text()) || "Failed to create user");

      const payload = (await res.json()) as {
        user: TeamMember;
        temporaryPassword: string;
      };

      setMembers((prev) => [payload.user, ...prev].sort((a, b) => a.email.localeCompare(b.email)));
      setCreatedCredentials({
        email: payload.user.email,
        temporaryPassword: payload.temporaryPassword,
        role: payload.user.role,
      });
      setNewMember({
        email: "",
        firstName: "",
        lastName: "",
        role: "influencer",
      });
      toast.success(`Created ${payload.user.email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Create Team User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Email address"
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Select
              value={newMember.role}
              onValueChange={(value) =>
                setNewMember((prev) => ({ ...prev, role: value as NewUserRole }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="influencer">Influencer</SelectItem>
                <SelectItem value="ugc_creator">UGC Creator</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="test_account">Test Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="First name"
              value={newMember.firstName}
              onChange={(e) => setNewMember((prev) => ({ ...prev, firstName: e.target.value }))}
            />
            <Input
              placeholder="Last name"
              value={newMember.lastName}
              onChange={(e) => setNewMember((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm text-gray-600">
              `test_account` only gets the Ad Library Scraper. Other roles follow normal portal access.
            </div>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={creating || !newMember.email.trim()}
              onClick={() => void createMember()}
            >
              {creating ? "Creating..." : "Create User"}
            </Button>
          </div>

          {createdCredentials ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-900">Temporary credentials</p>
              <p className="mt-2 text-emerald-800">Email: {createdCredentials.email}</p>
              <p className="text-emerald-800">Password: {createdCredentials.temporaryPassword}</p>
              <p className="text-emerald-700">Role: {createdCredentials.role}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={displayName(member)} /> : null}
                      <AvatarFallback>{initials(member)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{displayName(member)}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div>
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
                          <SelectItem value="affiliate">Affiliate</SelectItem>
                          <SelectItem value="test_account">Test Account</SelectItem>
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
    </div>
  );
}
