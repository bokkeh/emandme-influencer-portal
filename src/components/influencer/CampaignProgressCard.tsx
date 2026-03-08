"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NICHES } from "@/lib/constants/niches";
import { formatPhoneDisplay, normalizePhoneE164 } from "@/lib/phone";

type ChecklistItem = {
  label: string;
  done: boolean;
  href?: string;
};

type CampaignProduct = {
  shopifyProductId?: string;
  title: string;
  imageUrl?: string;
  imageUrls?: string[];
  variantId?: string;
};

type Props = {
  campaignId: string;
  canSubmitPetInfo: boolean;
  profileComplete: boolean;
  checklist: ChecklistItem[];
  campaignProducts: CampaignProduct[];
  initialProfileInfo: {
    displayName: string;
    phone: string;
    niche: string;
    shippingAddressLine1: string;
    shippingAddressLine2: string;
    shippingCity: string;
    shippingState: string;
    shippingPostalCode: string;
    shippingCountry: string;
  };
  initialPetInfo: {
    petName: string;
    petBreed: string;
    petAge: string;
    petPersonality: string;
    tagPersonalizationText: string;
    selectedProductId: string;
    selectedProductTitle: string;
    selectedProductVariantId: string;
  };
};

export function CampaignProgressCard({
  campaignId,
  canSubmitPetInfo,
  profileComplete,
  checklist,
  campaignProducts,
  initialProfileInfo,
  initialPetInfo,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(initialProfileInfo.displayName);
  const [phone, setPhone] = useState(formatPhoneDisplay(initialProfileInfo.phone));
  const [niche, setNiche] = useState(initialProfileInfo.niche);
  const [shippingAddressLine1, setShippingAddressLine1] = useState(initialProfileInfo.shippingAddressLine1);
  const [shippingAddressLine2, setShippingAddressLine2] = useState(initialProfileInfo.shippingAddressLine2);
  const [shippingCity, setShippingCity] = useState(initialProfileInfo.shippingCity);
  const [shippingState, setShippingState] = useState(initialProfileInfo.shippingState);
  const [shippingPostalCode, setShippingPostalCode] = useState(initialProfileInfo.shippingPostalCode);
  const [shippingCountry, setShippingCountry] = useState(initialProfileInfo.shippingCountry || "US");

  const [petName, setPetName] = useState(initialPetInfo.petName);
  const [petBreed, setPetBreed] = useState(initialPetInfo.petBreed);
  const [petAge, setPetAge] = useState(initialPetInfo.petAge);
  const [petPersonality, setPetPersonality] = useState(initialPetInfo.petPersonality);

  const defaultSelectedProductId = initialPetInfo.selectedProductId || "";
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    defaultSelectedProductId ? [defaultSelectedProductId] : []
  );
  const [personalizationByProduct, setPersonalizationByProduct] = useState<Record<string, string>>(
    defaultSelectedProductId
      ? {
          [defaultSelectedProductId]: initialPetInfo.tagPersonalizationText,
        }
      : {}
  );

  const completed = checklist.filter((item) => item.done).length;
  const percent = Math.round((completed / checklist.length) * 100);

  const hasMissingPersonalization = selectedProductIds.some(
    (id) => !(personalizationByProduct[id] ?? "").trim()
  );

  function toggleSelectedProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id]
    );
  }

  async function submitCampaignOnboarding() {
    if (!canSubmitPetInfo) {
      toast.error(
        profileComplete
          ? "Your enrollment is not approved yet."
          : "Please complete your profile first."
      );
      return;
    }

    if (
      !displayName.trim() ||
      !phone.trim() ||
      !niche.trim() ||
      !shippingAddressLine1.trim() ||
      !shippingCity.trim() ||
      !shippingState.trim() ||
      !shippingPostalCode.trim() ||
      !petName.trim() ||
      !petBreed.trim() ||
      !petAge.trim() ||
      !petPersonality.trim() ||
      selectedProductIds.length === 0 ||
      hasMissingPersonalization
    ) {
      toast.error("Please complete all required onboarding fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/influencer/campaigns/${campaignId}/onboarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          phone: normalizePhoneE164(phone),
          niche,
          shippingAddressLine1,
          shippingAddressLine2,
          shippingCity,
          shippingState,
          shippingPostalCode,
          shippingCountry,
          petName,
          petBreed,
          petAge,
          petPersonality,
          tagPersonalizationText: selectedProductIds
            .map((id) => {
              const product = campaignProducts.find((p, index) => (p.shopifyProductId || p.title || `product-${index}`) === id);
              const productTitle = product?.title ?? id;
              return `${productTitle}: ${personalizationByProduct[id] ?? ""}`;
            })
            .join("\n"),
          selectedProducts: selectedProductIds
            .map((id) => {
              const product = campaignProducts.find((p, index) => (p.shopifyProductId || p.title || `product-${index}`) === id);
              if (!product) return null;
              return {
                selectedProductId: product.shopifyProductId ?? null,
                selectedProductTitle: product.title,
                selectedProductVariantId: product.variantId ?? null,
                personalizationText: personalizationByProduct[id] ?? "",
                imageUrl: product.imageUrl ?? null,
              };
            })
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to submit onboarding");
      toast.success("Order submitted. Next step: upload your content for approval.", {
        action: {
          label: "Go to Upload",
          onClick: () => router.push(`/influencer/upload?campaignId=${campaignId}`),
        },
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit onboarding";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Campaign Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-gray-700">{percent}% Complete</p>
            <p className="text-gray-500">
              {completed}/{checklist.length}
            </p>
          </div>
          <Progress value={percent} className="h-2 bg-gray-100 [&_[data-slot=progress-indicator]]:bg-rose-600" />
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
              {item.href ? (
                <Link
                  href={item.href}
                  className={`${item.done ? "text-gray-800" : "text-gray-500"} underline decoration-dotted underline-offset-2 hover:text-rose-600`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={item.done ? "text-gray-800" : "text-gray-500"}>{item.label}</span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-md border border-gray-200 p-3">
          <p className="text-sm font-semibold text-gray-900">Campaign Onboarding</p>
          {!canSubmitPetInfo ? (
            <p className="text-xs text-amber-700">
              {profileComplete
                ? "Your enrollment is not approved yet. You can submit after approval."
                : "Please complete your profile first, then submit campaign details."}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Display name *</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                disabled={!canSubmitPetInfo || saving}
              />
            </div>
            <div>
              <Label>Niche *</Label>
              <Select
                value={niche}
                onValueChange={setNiche}
                disabled={!canSubmitPetInfo || saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Country *</Label>
              <Input value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div className="sm:col-span-2">
              <Label>Shipping Address *</Label>
              <Input value={shippingAddressLine1} onChange={(e) => setShippingAddressLine1(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address line 2</Label>
              <Input value={shippingAddressLine2} onChange={(e) => setShippingAddressLine2(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>State *</Label>
              <Input value={shippingState} onChange={(e) => setShippingState(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Postal code *</Label>
              <Input value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Pet name *</Label>
              <Input value={petName} onChange={(e) => setPetName(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Breed *</Label>
              <Input value={petBreed} onChange={(e) => setPetBreed(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Age *</Label>
              <Input value={petAge} onChange={(e) => setPetAge(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div className="sm:col-span-2">
              <Label>Personality *</Label>
              <Textarea rows={2} value={petPersonality} onChange={(e) => setPetPersonality(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Select campaign tag/product *</Label>
            {campaignProducts.length === 0 ? (
              <p className="text-xs text-gray-500">No products have been added to this campaign yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {campaignProducts.map((product, index) => {
                  const value = product.shopifyProductId || product.title || `product-${index}`;
                  const isSelected = selectedProductIds.includes(value);
                  const imageUrls = (product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleSelectedProduct(value)}
                      disabled={!canSubmitPetInfo || saving}
                      className={`rounded-lg border bg-white text-left transition ${
                        isSelected
                          ? "border-rose-500 ring-2 ring-rose-200"
                          : "border-gray-200 hover:border-rose-300"
                      }`}
                    >
                      <div className="relative rounded-t-lg bg-gray-100">
                        {imageUrls.length > 0 ? (
                          <div className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto">
                            {imageUrls.map((url, imageIndex) => (
                              <div
                                key={`${value}-image-${imageIndex}`}
                                className="h-full w-full shrink-0 snap-center"
                              >
                                <img
                                  src={url}
                                  alt={`${product.title} ${imageIndex + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex aspect-[4/3] h-full w-full items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                        <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border bg-white">
                          {isSelected ? <Check className="h-4 w-4 text-rose-600" /> : null}
                        </div>
                      </div>
                      {imageUrls.length > 1 ? (
                        <div className="px-3 pb-1 pt-2 text-[11px] text-gray-500">
                          Swipe image carousel to view all product photos
                        </div>
                      ) : null}
                      <div className="space-y-2 px-3 pb-3">
                        <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                        <div>
                          <Label className="text-xs">Tag personalization *</Label>
                          <Textarea
                            rows={2}
                            value={personalizationByProduct[value] ?? ""}
                            onChange={(e) =>
                              setPersonalizationByProduct((prev) => ({
                                ...prev,
                                [value]: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            disabled={!canSubmitPetInfo || saving}
                            placeholder="Ex: Front: BASIL | Back: Alex 555-555-5555"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void submitCampaignOnboarding()}
              disabled={!canSubmitPetInfo || saving}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {saving ? "Submitting..." : "Submit Order"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
