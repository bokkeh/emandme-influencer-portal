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

export default function AdminTaxDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [docs, setDocs] = useState<TaxDoc[]>([]);
  const [influencerProfileId, setInfluencerProfileId] = useState("");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear() - 1));
  const [file, setFile] = useState<File | null>(null);

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
      const res = await fetch("/api/admin/tax-documents");
      if (!res.ok) throw new Error((await res.text()) || "Failed to load tax documents");
      const data = (await res.json()) as { profiles: AdminProfile[]; docs: TaxDoc[] };
      setProfiles(data.profiles);
      setDocs(data.docs);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax Documents</h1>
        <p className="text-sm text-gray-500">Collect tax info and upload downloadable 1099 forms.</p>
      </div>

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
