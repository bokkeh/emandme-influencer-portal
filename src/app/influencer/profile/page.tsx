"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { CreditCard, Save } from "lucide-react";

const NICHES = ["beauty", "lifestyle", "fashion", "fitness", "food", "travel", "tech", "gaming", "parenting", "pets", "home_decor", "wellness"];

export default function InfluencerProfilePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({});

  async function handleStripeConnect() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast.error("Failed to connect Stripe. Please try again.");
      setStripeLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500">Manage your profile information and payment settings</p>
      </div>

      {/* Stripe Connect */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-rose-600" />
            Payment Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Connect your bank account via Stripe to receive payments directly. This is required before the team can pay you.
          </p>
          <Button
            onClick={handleStripeConnect}
            disabled={stripeLoading}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {stripeLoading ? "Redirecting to Stripe..." : "Connect Bank Account"}
          </Button>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSave}>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <Input name="displayName" defaultValue={user?.fullName ?? ""} placeholder="Your name or brand name" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" type="tel" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea name="bio" placeholder="Tell us about yourself and your content..." rows={3} />
            </div>
            <div>
              <Label>Niche / Category</Label>
              <Select name="niche">
                <SelectTrigger>
                  <SelectValue placeholder="Select your niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n} value={n} className="capitalize">{n.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm mt-4">
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Street Address</Label>
              <Input name="shippingAddressLine1" placeholder="123 Main St" />
            </div>
            <div>
              <Label>Apt / Suite</Label>
              <Input name="shippingAddressLine2" placeholder="Apt 4B (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input name="shippingCity" placeholder="Los Angeles" />
              </div>
              <div>
                <Label>State</Label>
                <Input name="shippingState" placeholder="CA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ZIP Code</Label>
                <Input name="shippingPostalCode" placeholder="90001" />
              </div>
              <div>
                <Label>Country</Label>
                <Input name="shippingCountry" defaultValue="US" placeholder="US" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit" className="bg-rose-600 hover:bg-rose-700 gap-2" disabled={loading}>
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
