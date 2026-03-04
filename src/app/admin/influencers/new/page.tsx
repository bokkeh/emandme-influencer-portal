"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewInfluencerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Influencer added! They'll receive an invitation email.");
      router.push("/admin/influencers");
    } catch (err) {
      toast.error("Failed to add influencer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/influencers">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Influencer</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Influencer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input name="firstName" placeholder="Jane" required />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input name="lastName" placeholder="Smith" />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input name="email" type="email" placeholder="jane@example.com" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select name="role" defaultValue="influencer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="ugc_creator">UGC Creator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select name="tier" defaultValue="nano">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nano">Nano (1K–10K)</SelectItem>
                    <SelectItem value="micro">Micro (10K–100K)</SelectItem>
                    <SelectItem value="macro">Macro (100K–1M)</SelectItem>
                    <SelectItem value="mega">Mega (1M+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Niche</Label>
              <Input name="niche" placeholder="beauty, lifestyle, fitness..." />
            </div>
            <div>
              <Label>Notes (internal)</Label>
              <Input name="notes" placeholder="Any internal notes about this influencer..." />
            </div>

            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? "Adding..." : "Add Influencer"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
