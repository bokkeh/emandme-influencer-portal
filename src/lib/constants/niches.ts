export const NICHES = [
  "beauty",
  "lifestyle",
  "fashion",
  "fitness",
  "food",
  "travel",
  "tech",
  "gaming",
  "parenting",
  "pets",
  "home_decor",
  "wellness",
] as const;

export type NicheValue = (typeof NICHES)[number];
