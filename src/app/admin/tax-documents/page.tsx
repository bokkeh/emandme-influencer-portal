"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminProfile = {
  id: string;
  displayName: string | null;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  taxLegalName: string | null;
  taxIdLast4: string | null;
  taxFormSubmittedAt: string | null;
};

type TaxDoc = {
  id: string;
  influencerProfileId: string;
  taxYear: number;
  documentType: string;
  fileUrl: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaxPayerSettings = {
  tax_payer_name: string;
  tax_payer_tin: string;
  tax_payer_address_line1: string;
  tax_payer_address_line2: string;
  tax_payer_city: string;
  tax_payer_state: string;
  tax_payer_postal_code: string;
  tax_payer_country: string;
};

const DEFAULT_TAX_PAYER_SETTINGS: TaxPayerSettings = {
  tax_payer_name: "",
  tax_payer_tin: "",
  tax_payer_address_line1: "",
  tax_payer_address_line2: "",
  tax_payer_city: "",
  tax_payer_state: "",
  tax_payer_postal_code: "",
  tax_payer_country: "US",
};

export default function AdminTaxDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generatingOne, setGeneratingOne] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [savingPayer, setSavingPayer] = useState(false);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [docs, setDocs] = useState<TaxDoc[]>([]);
  const [payer, setPayer] = useState<TaxPayerSettings>(DEFAULT_TAX_PAYER_SETTINGS);
  const [influencerProfileId, setInfluencerProfileId] = useState("");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear() - 1));
  const [file, setFile] = useState<File | null>(null);
  const [lastGenerationSummary, setLastGenerationSummary] = useState<{
    generatedCount: number;
    skippedCount: number;
  } | null>(null);

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => {
        const name =
          (profile.displayName ?? `${profile.userFirstName ?? ""} ${profile.userLastName ?? ""}`.trim()) ||
          profile.userEmail;
        return [profile.id, name];
      })
    );
  }, [profiles]);

  async function loadData() {
    setLoading(true);
    try {
      const [docsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/tax-documents"),
        fetch("/api/admin/tax-settings"),
      ]);
      if (!docsRes.ok) throw new Error((await docsRes.text()) || "Failed to load tax documents");
      if (!settingsRes.ok) throw new Error((await settingsRes.text()) || "Failed to load tax settings");
      const data = (await docsRes.json()) as { profiles: AdminProfile[]; docs: TaxDoc[] };
      const settings = (await settingsRes.json()) as TaxPayerSettings;
      setProfiles(data.profiles);
      setDocs(data.docs);
      setPayer({ ...DEFAULT_TAX_PAYER_SETTINGS, ...settings });
      if (!influencerProfileId && data.profiles[0]) setInfluencerProfileId(data.profiles[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load tax documents";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function uploadTaxDoc() {
    if (!influencerProfileId) {
      toast.error("Select an influencer");
      return;
    }
    if (!file) {
      toast.error("Choose a file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("influencerProfileId", influencerProfileId);
      formData.append("taxYear", taxYear);
      formData.append("documentType", "1099_nec");
      formData.append("file", file);

      const res = await fetch("/api/admin/tax-documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to upload tax document");
      toast.success("1099 uploaded");
      setFile(null);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload tax document";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(id: string) {
    const confirmed = window.confirm("Delete this tax document?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/tax-documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete tax document");
      toast.success("Document deleted");
      setDocs((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete tax document";
      toast.error(message);
    }
  }

  async function savePayerSettings() {
    setSavingPayer(true);
    try {
      const res = await fetch("/api/admin/tax-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payer),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save payer settings");
      toast.success("Payer tax settings saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save payer settings";
      toast.error(message);
    } finally {
      setSavingPayer(false);
    }
  }

  async function generate1099(generateAll: boolean) {
    if (!generateAll && !influencerProfileId) {
      toast.error("Select an influencer first");
      return;
    }
    const setLoadingState = generateAll ? setGeneratingAll : setGeneratingOne;
    setLoadingState(true);
    try {
      const res = await fetch("/api/admin/tax-documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxYear: Number(taxYear),
          influencerProfileId: generateAll ? null : influencerProfileId,
          generateAll,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to generate 1099");
      const data = (await res.json()) as { generatedCount: number; skippedCount: number };
      setLastGenerationSummary({
        generatedCount: data.generatedCount,
        skippedCount: data.skippedCount,
      });
      toast.success(`Generated ${data.generatedCount} document(s), skipped ${data.skippedCount}`);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate 1099";
      toast.error(message);
    } finally {
      setLoadingState(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax Documents</h1>
        <p className="text-sm text-gray-500">Collect tax info and upload downloadable 1099 forms.</p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Year-end 1099 Summary Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Year</Label>
            <Input className="w-32" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} />
          </div>
          <a href={`/api/admin/tax-documents/export?year=${encodeURIComponent(taxYear)}&format=csv`}>
            <Button variant="outline">Download CSV</Button>
          </a>
          <a href={`/api/admin/tax-documents/export?year=${encodeURIComponent(taxYear)}&format=pdf`}>
            <Button variant="outline">Download PDF</Button>
          </a>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Payer Company Fields (for 1099 layout)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Payer Legal Name</Label>
              <Input
                value={payer.tax_payer_name}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Payer TIN / EIN</Label>
              <Input
                value={payer.tax_payer_tin}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_tin: e.target.value }))}
              />
            </div>
            <div>
              <Label>Address Line 1</Label>
              <Input
                value={payer.tax_payer_address_line1}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_address_line1: e.target.value }))}
              />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input
                value={payer.tax_payer_address_line2}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_address_line2: e.target.value }))}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={payer.tax_payer_city}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_city: e.target.value }))}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={payer.tax_payer_state}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_state: e.target.value }))}
              />
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input
                value={payer.tax_payer_postal_code}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_postal_code: e.target.value }))}
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={payer.tax_payer_country}
                onChange={(e) => setPayer((prev) => ({ ...prev, tax_payer_country: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => void savePayerSettings()} disabled={savingPayer}>
              {savingPayer ? "Saving..." : "Save Payer Fields"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Upload 1099</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label>Influencer / UGC Creator</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={influencerProfileId}
                onChange={(e) => setInfluencerProfileId(e.target.value)}
              >
                <option value="">Select profile</option>
                {profiles.map((profile) => {
                  const name =
                    (profile.displayName ??
                      `${profile.userFirstName ?? ""} ${profile.userLastName ?? ""}`.trim()) ||
                    profile.userEmail;
                  return (
                    <option key={profile.id} value={profile.id}>
                      {name} ({profile.userEmail})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <Label>Tax Year</Label>
              <Input value={taxYear} onChange={(e) => setTaxYear(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>1099 File (PDF preferred)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end">
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={uploadTaxDoc} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload 1099"}
            </Button>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">Auto-generate from tax profile + paid amounts</p>
            <p className="mt-1 text-xs text-gray-500">
              Generates a draft 1099 summary PDF from stored tax details and paid payouts for the selected year.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void generate1099(false)}
                disabled={generatingOne}
              >
                {generatingOne ? "Generating..." : "Generate for selected profile"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void generate1099(true)}
                disabled={generatingAll}
              >
                {generatingAll ? "Generating..." : "Generate for all profiles"}
              </Button>
            </div>
            {lastGenerationSummary ? (
              <p className="mt-2 text-xs text-gray-600">
                Last run: generated {lastGenerationSummary.generatedCount}, skipped{" "}
                {lastGenerationSummary.skippedCount}.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tax Profile Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading profiles...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-3">Profile</th>
                    <th className="py-2 pr-3">Tax Legal Name</th>
                    <th className="py-2 pr-3">Tax ID Last 4</th>
                    <th className="py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-gray-900">{profileMap.get(profile.id)}</td>
                      <td className="py-2 pr-3">{profile.taxLegalName ?? "-"}</td>
                      <td className="py-2 pr-3">{profile.taxIdLast4 ? `***-${profile.taxIdLast4}` : "-"}</td>
                      <td className="py-2">
                        {profile.taxFormSubmittedAt
                          ? format(new Date(profile.taxFormSubmittedAt), "MMM d, yyyy")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Uploaded 1099 Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-gray-500">No tax documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {profileMap.get(doc.influencerProfileId) ?? doc.influencerProfileId} - 1099 ({doc.taxYear})
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.fileName ?? "file"} · Uploaded {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline">Open</Button>
                    </a>
                    <Button variant="outline" onClick={() => void deleteDoc(doc.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
