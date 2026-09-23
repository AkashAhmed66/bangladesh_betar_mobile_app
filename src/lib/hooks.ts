import {useCallback, useEffect, useMemo, useState} from 'react';
import {get} from './api';
import {useAuth} from '../stores/auth';
export function useApi<T>(path: string | null) {
  const token = useAuth(s => s.token);
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setLoading] = useState(Boolean(path));
  const key = useMemo(() => path ? `${path}|${token || 'guest'}` : null, [path, token]);
  const request = useCallback((signal?: AbortSignal) => path ? get<T>(path, signal) : Promise.resolve(undefined as T | undefined), [path]);
  const mutate = useCallback(async () => {
    if (!path) return undefined;
    setLoading(true);
    setError(undefined);
    try {
      const value = await request();
      setData(value);
      return value;
    } catch (e) {
      setError(e as Error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [path, request]);
  useEffect(() => {
    let active = true;
    if (!path) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    setLoading(true);
    void request(controller.signal)
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active && (e as {name?: string})?.name !== 'AbortError') setError(e as Error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [key, path, request]);
  return {data, error, isLoading, mutate, refetch: mutate};
}
export function usePollingApi<T>(path: string | null, interval: number) { const query = useApi<T>(path); useEffect(() => {if (!path) return; const timer = setInterval(() => void query.mutate(), interval); return () => clearInterval(timer);}, [path, interval]); return query; }
export function useProtectedApi<T>(path: string) { const token = useAuth(s => s.token); return useApi<T>(token ? path : null); }
const portalPath = (path: '/news' | '/watch', p: {category?: string; page?: number; perPage?: number; search?: string; sort?: string} = {}) => {const q = new URLSearchParams({page: String(p.page || 1), per_page: String(p.perPage || 24)}); if (p.category) q.set('category', p.category); if (p.search) q.set('q', p.search); if (p.sort) q.set('sort', p.sort); return `${path}?${q.toString()}`;};
export const useHome = () => useApi<any>('/home'); export const useForYou = () => useApi<any>('/recommendations/for-you'); export const useContinueListening = () => useProtectedApi<any>('/me/continue-listening'); export const useLiveChannels = () => usePollingApi<any>('/live-channels', 10000); export const useWatchLiveChannels = () => usePollingApi<any>('/watch-live-channels', 10000); export const useNewsArticles = (params: any = {}) => useApi<any>(portalPath('/news', params)); export const useNewsArticle = (slug: string) => useApi<any>(slug ? `/news/${encodeURIComponent(slug)}` : null); export const useWatchShows = (params: any = {}) => useApi<any>(portalPath('/watch', params)); export const useWatchShow = (slug: string) => useApi<any>(slug ? `/watch/${encodeURIComponent(slug)}` : null); export const usePortalCategories = () => useApi<any>('/portal-categories'); export const useTrending = () => useApi<any>('/trending'); export const useNewReleases = () => useApi<any>('/new-releases'); export const useOnThisDay = () => useApi<any>('/on-this-day'); export const useSearch = (q: string, type?: string) => useApi<any>(q.trim() ? `/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}` : null); export const useSuggestions = (q: string) => useApi<any>(q.trim().length > 1 ? `/search/suggest?q=${encodeURIComponent(q)}` : null); export const useCategories = () => useApi<any>('/categories'); export const useGenres = () => useApi<any>('/genres'); export const useSongs = (p = '') => useApi<any>(`/songs${p}`); export const useAlbums = (p = '') => useApi<any>(`/albums${p}`); export const useArtists = (p = '') => useApi<any>(`/artists${p}`); export const useProgrammes = (p = '') => useApi<any>(`/programmes${p}`); export const usePodcasts = (p = '') => useApi<any>(`/podcasts${p}`); export const useAudioBooks = () => useApi<any>('/audiobooks'); export const useSong = (id: number | string) => useApi<any>(`/songs/${id}`); export const useAlbum = (id: number | string) => useApi<any>(`/albums/${id}`); export const useArtist = (id: number | string) => useApi<any>(`/artists/${id}`); export const useProgramme = (id: number | string) => useApi<any>(`/programmes/${id}`); export const usePodcast = (id: number | string) => useApi<any>(`/podcasts/${id}`); export const useAudioBook = (id: number | string) => useApi<any>(`/audiobooks/${id}`); export const useEpisode = (id: number | string) => useApi<any>(`/episodes/${id}`); export const usePodcastEpisode = (id: number | string) => useApi<any>(`/podcast-episodes/${id}`); export const useAsset = (id: number | string | null) => useApi<any>(id ? `/assets/${id}` : null); export const useFavorites = () => useProtectedApi<any>('/me/favorites'); export const useHistory = () => useProtectedApi<any>('/me/history'); export const useMyPlaylists = () => useProtectedApi<any>('/me/playlists'); export const useMyPlaylist = (id: number | string) => useApi<any>(useAuth.getState().token ? `/me/playlists/${id}` : null); export const useFollows = () => useProtectedApi<any>('/me/follows'); export const useComments = (id: number | null) => useApi<any>(id ? `/assets/${id}/comments` : null); export const useMySubmissions = () => useProtectedApi<any>('/me/submissions'); export const usePlans = () => useApi<any>('/plans'); export const useSubscription = () => useProtectedApi<any>('/me/subscription'); export const usePayments = () => useProtectedApi<any>('/me/payments'); export const useBroadcastRecordings = (page = 1) => useApi<any>(`/broadcast-recordings?page=${page}`);

export const useLiveChannel = (id: number | string) => usePollingApi<any>(id ? `/live-channels/${id}` : null, 10000);
export const useWatchLiveChannel = (id: number | string | null) => usePollingApi<any>(id ? `/watch-live-channels/${id}` : null, 5000);
export const usePublicPlaylist = (id: number | string) => useApi<any>(`/playlists/${id}`);
export const useSimilar = (assetId: number | null) => useApi<any>(assetId ? `/assets/${assetId}/similar` : null);

