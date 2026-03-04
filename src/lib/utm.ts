export type UTMParams = {
  baseUrl: string;
  influencerHandle: string;
  platform: string;
  contentType?: string;
  campaignSlug?: string;
  label?: string;
};

export function buildUTMUrl(params: UTMParams): {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  fullUrl: string;
} {
  const sanitize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_");

  const utmSource = "influencer";
  const utmMedium = params.contentType
    ? `${sanitize(params.platform)}-${sanitize(params.contentType)}`
    : sanitize(params.platform);
  const utmCampaign = params.campaignSlug
    ? sanitize(params.campaignSlug)
    : `emandme_${new Date().getFullYear()}`;
  const utmContent = sanitize(params.influencerHandle);
  const utmTerm = "";

  const url = new URL(params.baseUrl);
  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", utmMedium);
  url.searchParams.set("utm_campaign", utmCampaign);
  url.searchParams.set("utm_content", utmContent);
  if (utmTerm) url.searchParams.set("utm_term", utmTerm);

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    fullUrl: url.toString(),
  };
}
