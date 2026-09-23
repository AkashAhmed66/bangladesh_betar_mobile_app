/** Native playback delegates HLS AES/DRM to react-native-video/AVPlayer.
 * Raw keys are never persisted by this module. */
export function parseOfflinePlaylist(text: string, assetId: number) { const segUrls = text.split(/\r?\n/).filter(x => x && !x.startsWith('#')); const key = text.match(/URI="([^"]+)"/)?.[1] || null; return { keyUrl: key, segUrls, template: text, ivHex: undefined }; }
export async function importOfflineKey() { throw new Error('Encrypted HLS offline playback requires a native DRM/secure key provider'); }
