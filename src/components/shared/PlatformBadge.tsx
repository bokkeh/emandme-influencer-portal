import { Badge } from "@/components/ui/badge";

const PLATFORM_STYLES: Record<string, { bg: string; label: string; emoji: string }> = {
  instagram: { bg: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0", label: "Instagram", emoji: "📸" },
  tiktok: { bg: "bg-black text-white border-0", label: "TikTok", emoji: "🎵" },
  youtube: { bg: "bg-red-600 text-white border-0", label: "YouTube", emoji: "▶️" },
  pinterest: { bg: "bg-red-700 text-white border-0", label: "Pinterest", emoji: "📌" },
  blog: { bg: "bg-blue-600 text-white border-0", label: "Blog", emoji: "✍️" },
};

export function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_STYLES[platform] ?? { bg: "bg-gray-200 text-gray-700 border-0", label: platform, emoji: "🌐" };
  return (
    <Badge className={`text-xs ${config.bg}`}>
      {config.emoji} {config.label}
    </Badge>
  );
}
