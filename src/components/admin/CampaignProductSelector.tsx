"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CampaignProduct = {
  shopifyProductId: string;
  title: string;
  imageUrl?: string;
  imageUrls?: string[];
  variantId?: string;
};

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  imageUrl: string | null;
  imageUrls?: string[];
  variantId: string | null;
};

type Props = {
  campaignId: string;
  initialProducts: CampaignProduct[];
};

export function CampaignProductSelector({ campaignId, initialProducts }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ShopifyProduct[]>([]);
  const [selected, setSelected] = useState<CampaignProduct[]>(initialProducts);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadProducts(search: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/shopify/products?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error((await res.text()) || "Failed to fetch products");
      const data = (await res.json()) as ShopifyProduct[];
      setResults(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch products";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.shopifyProductId)), [selected]);

  function addProduct(product: ShopifyProduct) {
    if (selectedIds.has(product.id)) return;
    setSelected((prev) => [
      ...prev,
      {
        shopifyProductId: product.id,
        title: product.title,
        imageUrl: product.imageUrl ?? undefined,
        imageUrls: product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [],
        variantId: product.variantId ?? undefined,
      },
    ]);
  }

  function removeProduct(productId: string) {
    setSelected((prev) => prev.filter((p) => p.shopifyProductId !== productId));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: selected }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to save campaign products");
      toast.success("Campaign products updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save campaign products";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Campaign Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Shopify products..."
            className="pl-9"
          />
        </div>

        <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200">
          {loading ? (
            <p className="p-3 text-sm text-gray-500">Searching products...</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">No products found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="h-9 w-9 rounded object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded bg-gray-100" />
                    )}
                    <p className="truncate text-sm text-gray-800">{product.title}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedIds.has(product.id) ? "outline" : "default"}
                    onClick={() => addProduct(product)}
                    disabled={selectedIds.has(product.id)}
                  >
                    {selectedIds.has(product.id) ? "Added" : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Selected ({selected.length})</p>
          {selected.length === 0 ? (
            <p className="text-sm text-gray-500">No products selected yet.</p>
          ) : (
            <div className="space-y-2">
              {selected.map((product) => (
                <div key={product.shopifyProductId} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="h-8 w-8 rounded object-cover" />
                    ) : null}
                    <p className="truncate text-sm font-medium text-gray-900">{product.title}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => removeProduct(product.shopifyProductId)}
                    aria-label={`Remove ${product.title}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" className="bg-rose-600 hover:bg-rose-700" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save Products"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
