"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type ChecklistItem = {
  label: string;
  done: boolean;
};

type CampaignProduct = {
  shopifyProductId?: string;
  title: string;
  imageUrl?: string;
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
  const [phone, setPhone] = useState(initialProfileInfo.phone);
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

  const defaultSelectedProductId =
    initialPetInfo.selectedProductId || campaignProducts[0]?.shopifyProductId || campaignProducts[0]?.title || "";
  const [selectedProductId, setSelectedProductId] = useState(defaultSelectedProductId);
  const [personalizationByProduct, setPersonalizationByProduct] = useState<Record<string, string>>(
    defaultSelectedProductId
      ? {
          [defaultSelectedProductId]: initialPetInfo.tagPersonalizationText,
        }
      : {}
  );

  const completed = checklist.filter((item) => item.done).length;
  const percent = Math.round((completed / checklist.length) * 100);

  const selectedProduct = useMemo(() => {
    return (
      campaignProducts.find((p) => (p.shopifyProductId || p.title) === selectedProductId) || null
    );
  }, [campaignProducts, selectedProductId]);
  const selectedPersonalization = selectedProductId ? (personalizationByProduct[selectedProductId] ?? "") : "";

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
      !selectedPersonalization.trim() ||
      !selectedProduct
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
          phone,
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
          tagPersonalizationText: selectedPersonalization,
          selectedProductId: selectedProduct.shopifyProductId ?? null,
          selectedProductTitle: selectedProduct.title,
          selectedProductVariantId: selectedProduct.variantId ?? null,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to submit onboarding");
      toast.success("Onboarding complete. Your order request has been sent to shipping.");
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
              <span className={item.done ? "text-gray-800" : "text-gray-500"}>{item.label}</span>
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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canSubmitPetInfo || saving} />
            </div>
            <div>
              <Label>Niche *</Label>
              <Input value={niche} onChange={(e) => setNiche(e.target.value)} disabled={!canSubmitPetInfo || saving} />
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
              <div className="grid gap-3 sm:grid-cols-2">
                {campaignProducts.map((product, index) => {
                  const value = product.shopifyProductId || product.title || `product-${index}`;
                  const isSelected = selectedProductId === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedProductId(value)}
                      disabled={!canSubmitPetInfo || saving}
                      className={`rounded-lg border bg-white text-left transition ${
                        isSelected
                          ? "border-rose-500 ring-2 ring-rose-200"
                          : "border-gray-200 hover:border-rose-300"
                      }`}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-3">
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
