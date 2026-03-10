"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Save, CheckCircle, Clock } from "lucide-react";
import { NICHES } from "@/lib/constants/niches";

export default function InfluencerProfilePage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [stripeStatus, setStripeStatus] = useState<{
    stripeAccountStatus: string | null;
    stripeDetailsSubmitted: boolean | null;
    stripePayoutsEnabled: boolean | null;
  }>({ stripeAccountStatus: null, stripeDetailsSubmitted: null, stripePayoutsEnabled: null });
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        if (!active) return;
        const { stripeAccountStatus, stripeDetailsSubmitted, stripePayoutsEnabled, ...rest } = data;
        setStripeStatus({
          stripeAccountStatus: (stripeAccountStatus as string) ?? null,
          stripeDetailsSubmitted: (stripeDetailsSubmitted as boolean) ?? null,
          stripePayoutsEnabled: (stripePayoutsEnabled as boolean) ?? null,
        });
        setProfile(
          Object.fromEntries(
            Object.entries(rest).map(([k, v]) => [k, v == null ? "" : String(v)])
          ) as Record<string, string>
        );
        setFormVersion((v) => v + 1);
      } catch {
        // no-op
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (!stripeParam) return;

    // Remove query param from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("stripe");
    window.history.replaceState({}, "", url.toString());

    if (stripeParam === "success") {
      // Refresh status directly from Stripe API (webhook may not have fired yet)
      fetch("/api/stripe/connect")
        .then((r) => r.ok ? r.json() : null)
        .then((data: { stripeAccountStatus: string; stripePayoutsEnabled: boolean; stripeDetailsSubmitted: boolean } | null) => {
          if (!data) return;
          setStripeStatus({
            stripeAccountStatus: data.stripeAccountStatus,
            stripeDetailsSubmitted: data.stripeDetailsSubmitted,
            stripePayoutsEnabled: data.stripePayoutsEnabled,
          });
          if (data.stripePayoutsEnabled) {
            toast.success("Bank account connected! You're ready to receive payments.");
          } else if (data.stripeDetailsSubmitted) {
            toast.success("Details submitted! Your account is pending verification.");
          } else {
            toast.info("Stripe setup incomplete. Please try connecting again.");
          }
        })
        .catch(() => {
          toast.info("Returned from Stripe — refreshing your status.");
        });
    } else if (stripeParam === "refresh") {
      toast.info("Stripe session expired. Please try connecting again.");
    }
  }, [searchParams]);

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
          {stripeStatus.stripePayoutsEnabled ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Bank account connected</p>
                <p className="text-xs text-green-600">You're all set to receive payments.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="ml-auto text-xs text-gray-500 hover:text-gray-700"
              >
                {stripeLoading ? "Loading..." : "Manage"}
              </Button>
            </div>
          ) : stripeStatus.stripeDetailsSubmitted ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Pending verification</p>
                  <p className="text-xs text-yellow-600">Stripe is reviewing your account. This usually takes 1–2 business days.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStripeConnect}
                disabled={stripeLoading}
                className="gap-2 text-xs"
              >
                <CreditCard className="h-3 w-3" />
                {stripeLoading ? "Redirecting..." : "Resume Setup"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSave} key={formVersion}>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                defaultValue={profile.email || user?.primaryEmailAddress?.emailAddress || ""}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <Input
                  name="displayName"
                  defaultValue={profile.displayName || user?.fullName || ""}
                  placeholder="Your name or brand name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone || ""}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                name="bio"
                defaultValue={profile.bio || ""}
                placeholder="Tell us about yourself and your content..."
                rows={3}
              />
            </div>
            <div>
              <Label>Niche / Category</Label>
              <Select name="niche" defaultValue={profile.niche || undefined}>
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
              <Input
                name="shippingAddressLine1"
                defaultValue={profile.shippingAddressLine1 || ""}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <Label>Apt / Suite</Label>
              <Input
                name="shippingAddressLine2"
                defaultValue={profile.shippingAddressLine2 || ""}
                placeholder="Apt 4B (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input name="shippingCity" defaultValue={profile.shippingCity || ""} placeholder="Los Angeles" />
              </div>
              <div>
                <Label>State</Label>
                <Input name="shippingState" defaultValue={profile.shippingState || ""} placeholder="CA" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ZIP Code</Label>
                <Input
                  name="shippingPostalCode"
                  defaultValue={profile.shippingPostalCode || ""}
                  placeholder="90001"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  name="shippingCountry"
                  defaultValue={profile.shippingCountry || "US"}
                  placeholder="US"
                />
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
