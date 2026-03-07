import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, campaigns } from "@/lib/db";

type CampaignBriefContent = {
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

export default async function PublicCampaignBriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const [campaign] = await db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      description: campaigns.description,
      briefUrl: campaigns.briefUrl,
      briefContent: campaigns.briefContent,
    })
    .from(campaigns)
    .where(eq(campaigns.briefShareToken, token))
    .limit(1);

  if (!campaign) notFound();

  const briefContent = (campaign.briefContent ?? {}) as CampaignBriefContent;
  const hasStructuredContent = BRIEF_SECTIONS.some((section) => Boolean(briefContent[section.key]?.trim()));
  const signUpForCampaignUrl = appUrl
    ? `${appUrl}/sign-up?redirect_url=${encodeURIComponent(`/onboarding?campaignId=${campaign.id}`)}`
    : `/sign-up?redirect_url=${encodeURIComponent(`/onboarding?campaignId=${campaign.id}`)}`;
  const createProfileUrl = appUrl ? `${appUrl}/onboarding` : "/onboarding";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <img
          src="https://emandmestudio.com/cdn/shop/files/black_logo_2x_a2bcf09e-ea61-4b77-8ca2-4f82c02e5c3f_220x.png?v=1619480991"
          alt="Em & Me Studio"
          className="h-9 w-auto"
        />
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

        {hasStructuredContent ? (
          <div className="mt-8 space-y-6">
            {BRIEF_SECTIONS.map((section) => {
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
            href={signUpForCampaignUrl}
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
          <a
            href={createProfileUrl}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Create profile
          </a>
        </div>
      </div>
    </main>
  );
}
