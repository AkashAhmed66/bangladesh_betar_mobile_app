/**
 * API object shapes — mirrors app/Http/Resources/* in the Laravel backend.
 * Every playable/followable object carries a `type` discriminator.
 */

export type PlayableType =
  | "song"
  | "audio_asset"
  | "podcast_episode"
  | "episode";

export type FollowableType = "artist" | "programme" | "podcast_channel" | "playlist";

export interface AudioAsset {
  id: number;
  type: "audio_asset";
  content_type: string;
  archive_no: string;
  title: string;
  title_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  duration_seconds: number | null;
  artwork_url: string | null;
  category?: string | null;
  language?: string | null;
  station?: string | null;
  programme?: string | null;
  artists?: Artist[];
  is_premium: boolean;
  is_public_service: boolean;
  content_warning: string | null;
  first_broadcast_on: string | null;
  play_count: number;
  favorite_count: number;
  avg_rating: number | null;
  rating_count: number;
  allow_comments: boolean;
  waveform?: number[] | null;
  chapters?: { title: string; start_seconds: number }[] | null;
  is_favorited?: boolean;
  my_rating?: number | null;
}

export interface Song {
  id: number;
  type: "song";
  title: string | null;
  title_bn: string | null;
  archive_no: string | null;
  audio_asset_id: number;
  duration_seconds: number | null;
  artwork_url: string | null;
  genre: string | null;
  mood: string | null;
  version_type: string | null;
  release_year: number | null;
  is_premium: boolean;
  play_count: number | null;
  avg_rating: number | null;
  singers?: string[];
  artists?: { id: number; name: string; role: string | null }[];
  album?: Album | null;
  lyrics?: { en: string | null; bn: string | null };
  waveform?: number[] | null;
  is_favorited?: boolean;
}

export interface Album {
  id: number;
  type: "album";
  title: string;
  title_bn: string | null;
  slug: string;
  album_type: string | null;
  year: number | null;
  artwork_url: string | null;
  description: string | null;
  description_bn: string | null;
  artists?: Artist[];
  tracks_count?: number;
  tracks?: Song[];
}

export interface Artist {
  id: number;
  type: "artist";
  name: string;
  name_bn: string | null;
  slug: string;
  artist_type: string | null;
  photo_url: string | null;
  cover_url?: string | null;
  is_featured: boolean;
  is_verified?: boolean;
  followers_count: number;
  monthly_listeners?: number;
  songs_count?: number;
  albums_count?: number;
  bio?: string | null;
  bio_bn?: string | null;
  social_links?: Record<string, string> | null;
  is_following?: boolean;
}

export interface Programme {
  id: number;
  type: "programme";
  title: string;
  title_bn: string | null;
  slug: string;
  programme_type: string | null;
  description: string | null;
  description_bn: string | null;
  artwork_url: string | null;
  station?: string | null;
  category?: string | null;
  followers_count: number;
  episodes_count?: number;
  is_following?: boolean;
}

export interface Episode {
  id: number;
  type: "episode";
  title: string;
  title_bn: string | null;
  slug: string;
  number: number | null;
  description: string | null;
  description_bn: string | null;
  programme?: string | null;
  programme_id: number;
  audio_asset_id: number | null;
  broadcast_date: string | null;
  duration_seconds: number | null;
  artwork_url: string | null;
  play_count: number;
}

export interface PodcastChannel {
  id: number;
  type: "podcast_channel";
  title: string;
  title_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  artwork_url: string | null;
  category?: string | null;
  followers_count: number;
  episodes_count?: number;
  rss_url: string | null;
  episodes?: PodcastEpisode[];
  is_following?: boolean;
}

export interface PodcastEpisode {
  id: number;
  type: "podcast_episode";
  title: string;
  title_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  channel?: PodcastChannel | null;
  channel_id: number;
  audio_asset_id: number | null;
  season_number: number | null;
  episode_number: number | null;
  duration_seconds: number | null;
  artwork_url: string | null;
  is_premium: boolean;
  published_at: string | null;
  chapters: { title: string; start_seconds: number }[] | null;
  play_count: number;
  hosts?: string[];
  artists?: { id: number; name: string; role: string | null }[];
}

export interface PlaylistItem {
  position: number;
  playable_type: string;
  playable_id: number;
  playable: Song | AudioAsset | PodcastEpisode | null;
  id?: number;
}

export interface Playlist {
  id: number;
  type: "playlist";
  title: string;
  title_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  artwork_url: string | null;
  is_editorial: boolean;
  is_owner?: boolean;
  is_public?: boolean;
  owner?: string | null;
  followers_count: number | null;
  is_following?: boolean;
  items_count?: number;
  items?: PlaylistItem[];
}

// ---- Live broadcasting (M27) ----

export interface LiveChannel {
  id: number;
  type: "live_channel";
  title: string;
  title_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  artwork_url: string | null;
  station?: string | null;
  station_id?: number | null;
  station_bn?: string | null;
  is_live: boolean;
  started_at: string | null;
  listener_count: number;
  broadcaster: string | null;
  session_title: string | null;
}

export interface LiveTokenResponse {
  ws_url: string;
  token: string;
  room: string;
}

export interface WatchLiveChannel {
  id: number;
  type: "watch_live_channel";
  title: string;
  title_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  artwork_url: string | null;
  station?: string | null;
  station_id?: number | null;
  station_bn?: string | null;
  is_live: boolean;
  started_at: string | null;
  viewer_count: number;
  broadcaster: string | null;
  session_title: string | null;
}

/** Anything that can appear in a home-section row or search results. */
export type CatalogueItem =
  | AudioAsset
  | Song
  | Album
  | Artist
  | Programme
  | Episode
  | PodcastChannel
  | PodcastEpisode
  | Playlist;

// ---- Home ----

export interface Banner {
  id: number;
  title: string;
  title_bn: string | null;
  subtitle: string | null;
  subtitle_bn: string | null;
  image_url: string | null;
  target_type: string | null;
  target_value: string | null;
}

export interface HomeSection {
  id: number;
  title: string;
  title_bn: string | null;
  type: string;
  layout: string;
  items: CatalogueItem[];
}

export interface HomeResponse {
  banners: Banner[];
  sections: HomeSection[];
}

// ---- News + Watch portals ----

export interface PortalCategory {
  id: number;
  parent_id?: number | null;
  value: string;
  label: string;
  label_bn: string | null;
  slug: string;
  description: string | null;
  description_bn: string | null;
  show_in_header: boolean;
  subcategories?: PortalCategory[];
}

export interface PortalCategories {
  news: PortalCategory[];
  watch: PortalCategory[];
}

export interface NewsArticle {
  id: number;
  type: "news_article";
  slug: string;
  title: string;
  title_bn: string | null;
  summary: string;
  summary_bn: string | null;
  category: string;
  category_bn: string | null;
  category_slug: string;
  body: string[];
  body_bn: string[] | null;
  image_url: string | null;
  media?: NewsArticleMedia[];
  read_time_minutes: number;
  read_time: string;
  views_count: number;
  is_featured: boolean;
  published_at: string | null;
  published: string;
}

export type NewsMediaType = "image" | "video" | "youtube" | "audio" | "document";

export interface NewsArticleMedia {
  id: number | string;
  type: NewsMediaType;
  url: string;
  embed_url?: string | null;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
}

export interface WatchEpisode {
  id: number;
  title: string;
  title_bn: string | null;
  description: string | null;
  description_bn: string | null;
  duration_minutes: number;
    duration: string;
    position: number;
    has_video: boolean;
  video_url: string | null;
  /** Optional editorial metadata supplied by the Watch admin portal. */
  summary?: string | null;
  summary_bn?: string | null;
  trailer_url?: string | null;
  age_rating?: string | null;
  genres?: string[];
  creators?: Array<string | WatchCredit>;
  cast?: Array<string | WatchCredit>;
  audio_languages?: string[];
  subtitle_languages?: string[];
  is_in_watchlist?: boolean;
}

export interface WatchCredit {
  name: string;
  role?: string | null;
  photo_url?: string | null;
}

export interface WatchShow {
  id: number;
  type: "watch_show";
  slug: string;
  title: string;
  title_bn: string | null;
  eyebrow: string | null;
  eyebrow_bn: string | null;
  description: string;
  description_bn: string | null;
  category: string;
  category_bn: string | null;
  category_slug: string;
  image_url: string | null;
  year: number | null;
  rating: string | null;
  is_featured: boolean;
  published_at: string | null;
  episodes_count?: number;
  episodes: WatchEpisode[];
  trailer_url?: string | null;
  age_rating?: string | null;
  genres?: string[];
  creators?: Array<string | WatchCredit>;
  cast?: Array<string | WatchCredit>;
  age_restriction?: string | null;
  audio_languages?: string[];
  subtitle_languages?: string[];
  is_in_watchlist?: boolean;
}

// ---- Auth / user ----

export interface Entitlements {
  plan: string;
  is_premium: boolean;
  is_authenticated?: boolean;
  ads_enabled: boolean;
  max_quality_kbps: number;
  skips_per_hour: number | null;
  /** Tracks a free listener may actively choose/queue per day. null = unlimited
   *  (premium); 0 = unlimited via admin config. After the budget is spent,
   *  autoplay falls back to a random radio mix. */
  daily_picks?: number | null;
  offline_downloads: boolean;
  equalizer: boolean;
  premium_content_access: "preview" | "full";
  preview_seconds: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  locale: "en" | "bn";
  avatar_url?: string | null;
  is_premium?: boolean;
  preferences?: Record<string, unknown> | null;
  entitlements?: Entitlements;
}

export interface TokenResponse {
  message: string;
  token: string;
  token_type: "Bearer";
  user: User;
}

// ---- Playback ----

export interface StreamDescriptor {
  version: string;
  url: string;
  /** True when `url` is an encrypted-HLS playlist (download protection). */
  is_hls?: boolean;
  expires_at: string;
  duration_seconds: number;
  is_preview: boolean;
  bitrate_kbps: number;
}

export interface AdDescriptor {
  id: number; // ad campaign id (used to log impressions)
  title: string;
  audio_asset_id: number;
  duration_seconds: number;
  slot: string;
  audio_url: string;
}

export interface StreamResponse {
  asset_id: number;
  title: string;
  stream: StreamDescriptor;
  ad: AdDescriptor | null;
  ad_every_n_songs?: number;
  daily_picks?: number | null;
  requires_login_for_full: boolean;
}

export type PlayEventType =
  | "play"
  | "pause"
  | "seek"
  | "replay"
  | "skip"
  | "progress"
  | "complete";

// ---- Search ----

// Public search only exposes the published catalogue — songs, programmes and
// podcasts with their episodes. Raw archive recordings and internal metadata
// (artists/albums) are intentionally excluded.
export interface SearchResults {
  query: string;
  results: {
    songs?: { data: Song[] };
    artists?: { data: Artist[] };
    programmes?: { data: Programme[] };
    episodes?: { data: Episode[] };
    podcast_episodes?: { data: PodcastEpisode[] };
    podcasts?: { data: PodcastChannel[] };
    live_radios?: { data: LiveChannel[] };
    audiobooks?: { data: AudioBook[] };
    broadcast_recordings?: { data: BroadcastRecording[] };
  };
}

export interface Suggestion {
  text: string;
  type:
    | "song"
    | "artist"
    | "programme"
    | "episode"
    | "podcast"
    | "podcast_episode"
    | "live_radio"
    | "audio_book"
    | "broadcast_recording";
}

export interface BroadcastRecording {
  id: number;
  type: "broadcast_recording";
  title: string;
  channel: {
    id: number;
    title: string;
    title_bn: string | null;
    artwork_url: string | null;
    station: string | null;
  };
  broadcaster: string | null;
  started_at: string | null;
  ended_at: string | null;
  published_at: string | null;
  duration_seconds: number;
  peak_listeners: number;
  is_premium: true;
  can_play: boolean;
}

// ---- Library ----

export interface HistoryEntry {
  progress_seconds: number;
  completed?: boolean;
  last_played_at?: string | null;
  asset: AudioAsset | null;
}

export interface QueueState {
  items: { type: string; id: number }[];
  repeat_mode: "off" | "all" | "one";
  shuffle: boolean;
}

// ---- Engagement ----

export interface Comment {
  id: number;
  body: string;
  rating?: number | null;
  status: string;
  author?: string | null;
  user_id: number;
  is_mine?: boolean;
  created_at: string | null;
}

export interface RatingAggregate {
  avg_rating: number;
  rating_count: number;
  your_rating: number;
}

export interface PostCommentResponse {
  message: string;
  data: Comment | null;
  rating: RatingAggregate | null;
}

// ---- Community Inbox (the listener's own reports / issues / feedback) ----

export type SubmissionStatus = "new" | "in_progress" | "resolved" | "dismissed";

export interface CommunitySubmission {
  id: number;
  type: "content_report" | "issue_report" | "feedback";
  type_label: string;
  category: string | null;
  category_label: string | null;
  subject_line: string | null;
  message: string | null;
  status: SubmissionStatus;
  resolution_notes: string | null;
  target?: { type: string; label: string | null };
  created_at: string | null;
  handled_at: string | null;
}

// ---- Subscription ----

/** Premium-only narrated book with read-along text (M31). */
export interface AudioBook {
  id: number;
  type: "audio_book";
  title: string;
  artwork_url: string | null;
  language: "en" | "bn";
  author?: string | null;
  is_premium: boolean;
  characters: number;
  duration_male: number;
  duration_female: number;
  duration_enhanced?: number;
  has_enhanced?: boolean;
  published_at?: string | null;
  /** Present only on the premium-gated detail response. Each voice key is
   *  present only when that narration was actually generated. */
  text?: string;
  streams?: { male?: string; female?: string; enhanced?: string };
}

export interface Plan {
  id: number;
  code: string;
  name: string;
  name_bn: string | null;
  description: string | null;
  description_bn: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  trial_days: number;
  features: Record<string, unknown> | null;
}

export interface SubscriptionState {
  plan: string | null;
  status: string;
  billing_cycle: string | null;
  started_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  auto_renew: boolean;
}

export interface SubscriptionStatus {
  entitlements: Entitlements;
  subscription: SubscriptionState | null;
}

export interface PaymentRecord {
  invoice_no: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paid_at: string | null;
}

// ---- Misc ----

export interface Taxonomy {
  id: number;
  name: string;
  name_bn: string | null;
  slug: string;
}

export interface Paginated<T> {
  data: T[];
  links?: { first?: string; last?: string; prev?: string | null; next?: string | null };
  meta?: { current_page: number; last_page?: number; total?: number; per_page?: number };
}

export interface WatchClip {
  id: number;
  title: string;
  title_bn: string | null;
  description: string | null;
  description_bn: string | null;
  slug: string;
  creator_name: string | null;
  creator_handle: string | null;
  creator_avatar_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  audio_track: string | null;
  hashtags: string[];
  likes_count: number;
  dislikes_count: number;
  published_at: string | null;
}

