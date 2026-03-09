import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, campaigns } from "@/lib/db";
import { DEFAULT_EM_ME_LOGO_DARK_URL, getBrandingSettings } from "@/lib/branding";

type CampaignBriefContent = {
  heroImageUrl?: string;
  campaignOverview?: string;
  brandIntroduction?: string;
  campaignGoals?: string;
  deliverables?: string;
  creativeDirection?: string;
  keyProductPoints?: string;
  messagingGuidelines?: string;
  visualGuidelines?: string;
  taggingHashtags?: string;
  linkDiscountCode?: string;
  timeline?: string;
  ftcDisclosure?: string;
  dosAndDonts?: string;
};

const BRIEF_SECTIONS: Array<{ key: keyof CampaignBriefContent; title: string }> = [
  { key: "campaignOverview", title: "1. Campaign Overview" },
  { key: "brandIntroduction", title: "2. Brand Introduction" },
  { key: "campaignGoals", title: "3. Campaign Goals" },
  { key: "deliverables", title: "4. Deliverables" },
  { key: "creativeDirection", title: "5. Creative Direction" },
  { key: "keyProductPoints", title: "6. Key Product Points" },
  { key: "messagingGuidelines", title: "7. Messaging Guidelines" },
  { key: "visualGuidelines", title: "8. Visual Guidelines" },
  { key: "taggingHashtags", title: "9. Tagging + Hashtags" },
  { key: "linkDiscountCode", title: "10. Link / Discount Code" },
  { key: "timeline", title: "11. Timeline" },
  { key: "ftcDisclosure", title: "12. FTC Disclosure" },
  { key: "dosAndDonts", title: "Do's and Don'ts" },
];

function getVisibleSections(campaignType: "influencer" | "ugc" | "affiliate") {
  return BRIEF_SECTIONS.filter((section) => {
    if (campaignType === "ugc" && section.key === "taggingHashtags") return false;
    if ((campaignType === "ugc" || campaignType === "affiliate") && section.key === "ftcDisclosure") return false;
    return true;
  });
}

function getTypeBadgeLabel(campaignType: "influencer" | "ugc" | "affiliate") {
  if (campaignType === "ugc") return "UGC";
  if (campaignType === "affiliate") return "Affiliate";
  return null;
}

export default async function PublicCampaignBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const branding = await getBrandingSettings();
  const [campaign] = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      description: campaigns.description,
      briefUrl: campaigns.briefUrl,
      briefContent: campaigns.briefContent,
      campaignType: campaigns.campaignType,
      products: campaigns.products,
    })
    .from(campaigns)
    .where(eq(campaigns.briefShareToken, token))
    .limit(1);

  if (!campaign) notFound();

  const briefContent = (campaign.briefContent ?? {}) as CampaignBriefContent;
  const heroImageUrl = briefContent.heroImageUrl?.trim() ?? "";
  const campaignType = (campaign.campaignType as "influencer" | "ugc" | "affiliate" | null) ?? "influencer";
  const sectionDefs = getVisibleSections(campaignType);
  const typeBadge = getTypeBadgeLabel(campaignType);
  const hasStructuredContent = sectionDefs.some((section) => Boolean(briefContent[section.key]?.trim()));
  const featuredProducts =
    ((campaign.products as Array<{ title?: string; imageUrl?: string; imageUrls?: string[]; variantId?: string }>) ?? [])
      .map((p, index) => {
        const imageUrl = p.imageUrl ?? p.imageUrls?.[0] ?? "";
        const title = (p.title ?? "").trim() || `Product ${index + 1}`;
        return { title, imageUrl, variantId: p.variantId ?? "" };
      })
      .filter((p) => p.title);
  const logoUrl = branding.logoDarkUrl ?? DEFAULT_EM_ME_LOGO_DARK_URL;
  const joinCampaignUrl = appUrl ? `${appUrl}/api/brief/${token}/join` : `/api/brief/${token}/join`;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {heroImageUrl ? (
          <div className="mb-6 overflow-hidden rounded-lg border border-gray-200">
            <img src={heroImageUrl} alt="Campaign brief header" className="h-auto w-full object-cover" />
          </div>
        ) : null}
        <div className="mb-6 flex justify-center p-[15px]">
          <img src={logoUrl} alt="Em & Me Studio" className="h-9 w-auto" />
        </div>
        {typeBadge ? (
          <div className="mb-2">
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
              {typeBadge}
            </span>
          </div>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{campaign.title}</h1>
        {campaign.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">{campaign.description}</p> : null}
        {campaign.briefUrl ? (
          <p className="mt-3 text-sm">
            External brief:{" "}
            <a
              className="text-rose-600 underline underline-offset-2"
              href={campaign.briefUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open link
            </a>
          </p>
        ) : null}

        {featuredProducts.length > 0 ? (
          <section className="mt-8 border-t border-gray-200 pt-5">
            <h2 className="text-lg font-semibold text-gray-900">Featured Products</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product, index) => (
                <div key={`${product.title}-${index}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className="flex h-36 items-center justify-center bg-gray-50">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900">{product.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {hasStructuredContent ? (
          <div className="mt-8 space-y-6">
            {sectionDefs.map((section) => {
              const value = briefContent[section.key]?.trim();
              if (!value) return null;
              return (
                <section key={section.key} className="border-t border-gray-200 pt-5">
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  <div
                    className="mt-2 text-sm leading-6 text-gray-700 [&_a]:text-rose-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: value }}
                  />
                </section>
              );
            })}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
          <a
            href={joinCampaignUrl}
            className="inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Sign up for the campaign
          </a>
          <a
            href="https://emandmestudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Visit Emandmestudio.com
          </a>
        </div>
      </div>
    </main>
  );
}
