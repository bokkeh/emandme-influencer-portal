"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TaxProfile = {
  taxLegalName: string | null;
  taxClassification: string | null;
  taxIdLast4: string | null;
  taxAddressLine1: string | null;
  taxAddressLine2: string | null;
  taxCity: string | null;
  taxState: string | null;
  taxPostalCode: string | null;
  taxCountry: string | null;
  taxFormSubmittedAt: string | null;
};

type TaxDocument = {
  id: string;
  taxYear: number;
  documentType: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  taxLegalName: string;
  taxClassification: string;
  taxIdLast4: string;
  taxAddressLine1: string;
  taxAddressLine2: string;
  taxCity: string;
  taxState: string;
  taxPostalCode: string;
  taxCountry: string;
};

const TAX_CLASSIFICATIONS = [
  "individual_sole_prop",
  "llc_single_member",
  "llc_partnership",
  "llc_c_corp",
  "llc_s_corp",
  "corporation",
  "partnership",
];

function toForm(profile: TaxProfile | null): FormState {
  return {
    taxLegalName: profile?.taxLegalName ?? "",
    taxClassification: profile?.taxClassification ?? "",
    taxIdLast4: profile?.taxIdLast4 ?? "",
    taxAddressLine1: profile?.taxAddressLine1 ?? "",
    taxAddressLine2: profile?.taxAddressLine2 ?? "",
    taxCity: profile?.taxCity ?? "",
    taxState: profile?.taxState ?? "",
    taxPostalCode: profile?.taxPostalCode ?? "",
    taxCountry: profile?.taxCountry ?? "US",
  };
}

export default function TaxDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [docs, setDocs] = useState<TaxDocument[]>([]);
  const [form, setForm] = useState<FormState>(toForm(null));

  const hasTaxProfile = useMemo(() => {
    return Boolean(
      form.taxLegalName.trim() &&
        form.taxClassification.trim() &&
        /^\d{4}$/.test(form.taxIdLast4.trim()) &&
        form.taxAddressLine1.trim() &&
        form.taxCity.trim() &&
        form.taxState.trim() &&
        form.taxPostalCode.trim()
    );
  }, [form]);

  async function loadData() {
    setLoading(true);
    try {
      const [profileRes, docsRes] = await Promise.all([fetch("/api/tax/profile"), fetch("/api/tax/documents")]);
      if (!profileRes.ok) throw new Error((await profileRes.text()) || "Failed to load tax profile");
      if (!docsRes.ok) throw new Error((await docsRes.text()) || "Failed to load tax documents");
      const profileData = (await profileRes.json()) as TaxProfile;
      const docsData = (await docsRes.json()) as TaxDocument[];
      setProfile(profileData);
      setForm(toForm(profileData));
      setDocs(docsData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load tax data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveTaxProfile() {
    if (!/^\d{4}$/.test(form.taxIdLast4.trim())) {
      toast.error("Tax ID last 4 must be exactly 4 digits");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tax/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save tax profile");
      const updated = (await res.json()) as TaxProfile;
      setProfile(updated);
      toast.success("Tax information saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save tax information";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax Documents</h1>
        <p className="text-sm text-gray-500">Submit tax details and download your yearly 1099 forms.</p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tax Profile (W-9 Details)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading tax profile...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Legal Name</Label>
                  <Input
                    value={form.taxLegalName}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxLegalName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Tax Classification</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.taxClassification}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxClassification: e.target.value }))}
                  >
                    <option value="">Select classification</option>
                    {TAX_CLASSIFICATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tax ID Last 4</Label>
                  <Input
                    maxLength={4}
                    value={form.taxIdLast4}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxIdLast4: e.target.value.replace(/\D/g, "") }))}
                    placeholder="1234"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    maxLength={2}
                    value={form.taxCountry}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxCountry: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Address Line 1</Label>
                  <Input
                    value={form.taxAddressLine1}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxAddressLine1: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Address Line 2</Label>
                  <Input
                    value={form.taxAddressLine2}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxAddressLine2: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.taxCity} onChange={(e) => setForm((prev) => ({ ...prev, taxCity: e.target.value }))} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.taxState} onChange={(e) => setForm((prev) => ({ ...prev, taxState: e.target.value }))} />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input
                    value={form.taxPostalCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxPostalCode: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Last submitted:{" "}
                  {profile?.taxFormSubmittedAt ? format(new Date(profile.taxFormSubmittedAt), "MMM d, yyyy h:mm a") : "Never"}
                </p>
                <Button className="bg-rose-600 hover:bg-rose-700" onClick={saveTaxProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save Tax Details"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">1099 Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-gray-500">
              No 1099 documents available yet. Once your form is processed, they will show up here.
            </p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Form 1099-NEC ({doc.taxYear})</p>
                    <p className="text-xs text-gray-500">
                      Uploaded {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline">Download</Button>
                  </a>
                </div>
              ))}
            </div>
          )}
          {!hasTaxProfile ? (
            <p className="mt-3 text-xs text-amber-700">
              Complete your tax profile above so the team can prepare your 1099.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
