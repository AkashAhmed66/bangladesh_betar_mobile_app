import { useApi } from './hooks';
import { destroy, post } from './api';
import { useAuth } from '../stores/auth';
import type { WatchEpisode, WatchShow } from './types';
export type WatchlistType = 'watch_show' | 'watch_episode';
export interface SavedEpisode extends WatchEpisode {
  show: Pick<WatchShow, 'id' | 'slug' | 'title' | 'title_bn' | 'image_url'>;
}
export type WatchlistEntry = {
  id: number;
  watchable_id: number;
  added_at: string;
} & (
  | { watchable_type: 'watch_show'; item: WatchShow }
  | { watchable_type: 'watch_episode'; item: SavedEpisode }
);
export interface WatchlistResponse {
  data: WatchlistEntry[];
}
export function useWatchlist() {
  const token = useAuth(s => s.token);
  return useApi<WatchlistResponse>(token ? '/me/watchlist' : null);
}
type ToggleResponse = {
  data?: { is_in_watchlist?: boolean; watchlisted?: boolean };
  is_in_watchlist?: boolean;
  watchlisted?: boolean;
};

/** Toggle a show/episode on the server. The returned flag is authoritative. */
export async function toggleWatchlist(
  type: WatchlistType,
  id: number,
  initial = false,
): Promise<boolean> {
  const response = await post<ToggleResponse>('/me/watchlist/toggle', {
    watchable_type: type,
    watchable_id: id,
  });
  return Boolean(
    response.data?.is_in_watchlist ??
      response.data?.watchlisted ??
      response.is_in_watchlist ??
      response.watchlisted ??
      !initial,
  );
}

/** Remove an item explicitly (used by the watchlist screen). */
export async function removeWatchlist(
  type: WatchlistType,
  id: number,
): Promise<void> {
  await destroy(`/me/watchlist/${type}/${id}`);
}
