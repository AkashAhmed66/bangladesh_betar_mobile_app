import type { CatalogueItem } from "./types";

/** 245 -> "4:05"; 3725 -> "1:02:05" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "–:––";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

/** 1234567 -> "1.2M" */
export function formatCount(n: number | null | undefined, locale: "en" | "bn" = "en"): string {
  if (n == null) return "0";
  if (locale === "bn") return new Intl.NumberFormat("bn-BD", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatDate(iso: string | null | undefined, locale: "en" | "bn" = "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string | null | undefined, locale: "en" | "bn" = "en"): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const relative = new Intl.RelativeTimeFormat(locale === "bn" ? "bn-BD" : "en", { numeric: "auto", style: "short" });
  if (mins < 1) return relative.format(0, "minute");
  if (mins < 60) return relative.format(-mins, "minute");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return relative.format(-days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return relative.format(-months, "month");
  return relative.format(-Math.floor(months / 12), "year");
}

/** Primary display title honouring the locale preference. */
export function displayTitle(
  item: { title?: string | null; title_bn?: string | null; name?: string | null; name_bn?: string | null },
  locale: "en" | "bn",
): string {
  const en = item.title ?? item.name ?? "Untitled";
  const bn = item.title_bn ?? item.name_bn;
  return locale === "bn" && bn ? bn : en;
}

/** Secondary (other-language) title, when it differs. */
export function altTitle(
  item: { title?: string | null; title_bn?: string | null; name?: string | null; name_bn?: string | null },
  locale: "en" | "bn",
): string | null {
  const en = item.title ?? item.name ?? null;
  const bn = item.title_bn ?? item.name_bn ?? null;
  return locale === "bn" ? en : bn;
}

/** Human label for a catalogue item's kind. */
export function typeLabel(type: CatalogueItem["type"] | string): string {
  switch (type) {
    case "audio_asset": return "Recording";
    case "song": return "Song";
    case "album": return "Album";
    case "artist": return "Artist";
    case "programme": return "Programme";
    case "episode": return "Episode";
    case "podcast_channel": return "Podcast";
    case "podcast_episode": return "Podcast episode";
    case "playlist": return "Playlist";
    default: return "Item";
  }
}

/** Route to an item's detail page. */
export function itemHref(item: { type: string; id: number }): string {
  switch (item.type) {
    case "song": return `/songs/${item.id}`;
    case "album": return `/albums/${item.id}`;
    case "artist": return `/artists/${item.id}`;
    case "programme": return `/programmes/${item.id}`;
    case "episode": return `/episodes/${item.id}`;
    case "podcast_channel": return `/podcasts/${item.id}`;
    case "podcast_episode": return `/podcast-episodes/${item.id}`;
    case "playlist": return `/playlists/${item.id}`;
    default: return `/assets/${item.id}`;
  }
}

export function formatMoney(amount: number, currency: string, locale: "en" | "bn" = "en"): string {
  const symbol = currency === "BDT" ? "৳" : currency + " ";
  return `${symbol}${amount.toLocaleString(locale === "bn" ? "bn-BD" : "en-IN", { maximumFractionDigits: 0 })}`;
}
