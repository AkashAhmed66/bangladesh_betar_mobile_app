import { create } from 'zustand';
import RNFS from 'react-native-fs';
import { resolveApiBase } from '../lib/api';
import { deleteOffline, listOffline, saveOfflineMeta, offlineRoot, type OfflineMeta } from '../lib/offline';
import type { PlayerTrack } from './player';
import { currentEntitlements, useAuth } from './auth';
import { useUi } from './ui';
interface DownloadsState { records: Record<number, OfflineMeta>; progress: Record<number, number>; hydrated: boolean; hydrate: () => Promise<void>; download: (track: PlayerTrack) => Promise<void>; remove: (assetId: number) => Promise<void>; isDownloaded: (assetId: number) => boolean; isDownloading: (assetId: number) => boolean; }
export function offlineToTrack(m: OfflineMeta): PlayerTrack { return { key: `${m.type}:${m.id}`, type: m.type, id: m.id, assetId: m.assetId, title: m.title, titleBn: m.titleBn, subtitle: m.subtitle, artworkUrl: m.artworkUrl, duration: m.duration, isPremium: m.isPremium, href: m.href }; }
export const useDownloads = create<DownloadsState>((set, get) => ({
  records: {}, progress: {}, hydrated: false,
  hydrate: async () => { const list = await listOffline().catch(() => []); set({ records: Object.fromEntries(list.map(x => [x.assetId, x])), hydrated: true }); },
  download: async track => {
    if (get().records[track.assetId] || get().progress[track.assetId] != null) return;
    if (!currentEntitlements().offline_downloads) { useUi.getState().openUpgradePrompt({ title: 'Offline listening is Premium', body: 'Upgrade to save recordings for offline use.' }); return; }
    const token = useAuth.getState().token; if (!token) { useUi.getState().openLoginPrompt('Sign in with your Premium account to save recordings offline.'); return; }
    set(s => ({ progress: { ...s.progress, [track.assetId]: 1 } }));
    try {
      const response = await fetch(`${resolveApiBase()}/assets/${track.assetId}/offline-manifest`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      if (!response.ok) throw new Error(response.status === 403 ? 'premium-required' : `manifest ${response.status}`);
      const manifest = await response.json() as { playlist_url?: string; download_url?: string; license_days?: number; duration_seconds?: number };
      if (!manifest.playlist_url && !manifest.download_url) throw new Error('offline-manifest-empty');
      await RNFS.mkdir(offlineRoot);
      let meta: OfflineMeta;
      if (manifest.playlist_url) {
        const built = await downloadEncryptedHls(manifest.playlist_url, track.assetId, token, pct => set(s => ({ progress: { ...s.progress, [track.assetId]: pct } })));
        meta = { ...track, assetId: track.assetId, size: built.size, downloadedAt: Date.now(), kind: 'hls', playlist: built.playlist, playlistPath: built.playlistPath, keyUrl: built.keyUrl, keyPath: built.keyPath, segmentPaths: built.segmentPaths, duration: track.duration ?? manifest.duration_seconds ?? null, expiresAt: Date.now() + (manifest.license_days ?? 30) * 86400000 };
      } else {
        const path = `${offlineRoot}/${track.assetId}.media`;
        await RNFS.downloadFile({ fromUrl: manifest.download_url!, toFile: path, headers: { Authorization: `Bearer ${token}` }, progress: p => set(s => ({ progress: { ...s.progress, [track.assetId]: p.contentLength ? Math.round((p.bytesWritten / p.contentLength) * 100) : 1 } })) }).promise;
        meta = { ...track, assetId: track.assetId, size: (await RNFS.stat(path)).size, downloadedAt: Date.now(), localPath: path, expiresAt: Date.now() + (manifest.license_days ?? 30) * 86400000 };
      }
      await saveOfflineMeta(meta); set(s => { const progress = { ...s.progress }; delete progress[track.assetId]; return { records: { ...s.records, [track.assetId]: meta }, progress }; });
      useUi.getState().toast(`Saved “${track.title}” for offline listening.`, 'success');
    } catch (e) { await deleteOffline(track.assetId).catch(() => undefined); set(s => { const progress = { ...s.progress }; delete progress[track.assetId]; return { progress }; }); const msg = e instanceof Error ? e.message : ''; if (msg === 'premium-required') useUi.getState().openUpgradePrompt({ title: 'Offline listening is Premium', body: 'Upgrade to save recordings for offline use.' }); else useUi.getState().toast(msg || 'Offline download failed.', 'error'); }
  },
  remove: async assetId => { await deleteOffline(assetId); set(s => { const records = { ...s.records }; delete records[assetId]; return { records }; }); },
  isDownloaded: id => !!get().records[id], isDownloading: id => get().progress[id] != null,
}));

function joinUrl(base: string, value: string) { return new URL(value, base).toString(); }
function base64(bytes: ArrayBuffer) { const a = new Uint8Array(bytes); const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let out = ''; for (let i = 0; i < a.length; i += 3) { const x = a[i], y = i + 1 < a.length ? a[i + 1] : 0, z = i + 2 < a.length ? a[i + 2] : 0; out += table[x >> 2] + table[((x & 3) << 4) | (y >> 4)] + (i + 1 < a.length ? table[((y & 15) << 2) | (z >> 6)] : '=') + (i + 2 < a.length ? table[z & 63] : '='); } return out; }
async function writeBytes(path: string, bytes: ArrayBuffer) { await RNFS.writeFile(path, base64(bytes), 'base64'); }
async function downloadEncryptedHls(url: string, assetId: number, token: string, onProgress: (value: number) => void) {
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*' };
  let playlist = await (await fetch(url, { headers })).text();
  // A master playlist is legal; pick its first media variant so the saved
  // package is deterministic and playable by AVPlayer/ExoPlayer offline.
  if (playlist.includes('#EXT-X-STREAM-INF')) { const variant = playlist.split(/\r?\n/).find(x => x && !x.startsWith('#')); if (variant) { url = joinUrl(url, variant); playlist = await (await fetch(url, { headers })).text(); } }
  const lines = playlist.split(/\r?\n/); const keyMatch = playlist.match(/URI="([^"]+)"/); const keyUrl = keyMatch ? joinUrl(url, keyMatch[1]) : undefined;
  const dir = `${offlineRoot}/${assetId}`; await RNFS.mkdir(dir); let keyPath: string | undefined;
  if (keyUrl) { const key = await (await fetch(keyUrl, { headers })).arrayBuffer(); keyPath = `${dir}/key.bin`; await writeBytes(keyPath, key); }
  const segmentPaths: string[] = []; const out: string[] = []; const segments = lines.filter(x => x && !x.startsWith('#'));
  let done = 0;
  for (let i = 0; i < lines.length; i++) { const line = lines[i]; if (!line || line.startsWith('#')) { out.push(line); continue; } const segUrl = joinUrl(url, line); const bytes = await (await fetch(segUrl, { headers })).arrayBuffer(); const path = `${dir}/seg-${segmentPaths.length}.bin`; await writeBytes(path, bytes); segmentPaths.push(path); out.push(`file://${path}`); done++; onProgress(Math.max(1, Math.round(done / Math.max(1, segments.length) * 100))); }
  const rewritten = out.map(x => keyPath && x.includes('URI="') ? x.replace(/URI="[^"]+"/, `URI="file://${keyPath}"`) : x).join('\n'); const playlistPath = `${dir}/playlist.m3u8`; await RNFS.writeFile(playlistPath, rewritten, 'utf8');
  const stat = await RNFS.stat(playlistPath); return { playlist: rewritten, playlistPath, keyUrl, keyPath, segmentPaths, size: stat.size + segmentPaths.reduce((n, p) => n, 0) };
}



