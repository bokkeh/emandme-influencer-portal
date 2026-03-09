import { inArray } from "drizzle-orm";
import { db, appSettings } from "@/lib/db";

export type BrandingSettings = {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
};

export const DEFAULT_EM_ME_LOGO_DARK_URL =
  "https://emandmestudio.com/cdn/shop/files/black_logo_2x_a2bcf09e-ea61-4b77-8ca2-4f82c02e5c3f_220x.png?v=1619480991";

const LOGO_LIGHT_KEY = "brand_logo_light_url";
const LOGO_DARK_KEY = "brand_logo_dark_url";

export async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const rows = await db
      .select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(inArray(appSettings.key, [LOGO_LIGHT_KEY, LOGO_DARK_KEY]));

    const logoLightUrl = rows.find((row) => row.key === LOGO_LIGHT_KEY)?.value ?? null;
    const logoDarkUrl = rows.find((row) => row.key === LOGO_DARK_KEY)?.value ?? null;

    return { logoLightUrl, logoDarkUrl: logoDarkUrl ?? DEFAULT_EM_ME_LOGO_DARK_URL };
  } catch {
    return { logoLightUrl: null, logoDarkUrl: DEFAULT_EM_ME_LOGO_DARK_URL };
  }
}

export const BRANDING_KEYS = {
  logoLight: LOGO_LIGHT_KEY,
  logoDark: LOGO_DARK_KEY,
} as const;
