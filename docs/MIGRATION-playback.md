# Playback migration (web ? React Native)

This document maps the web playback contract to the native implementation in `src/`.

| Web capability | Native implementation |
| --- | --- |
| `/assets/{id}/stream` resolution | `stores/player.ts::resolveCurrent`; honours `ad=1`, `ad_every_n_songs`, `daily_picks`, preview and premium flags. |
| Lifecycle analytics | `play`, `pause`, `seek`, `progress` (10-second cadence), `replay`, `skip`, and `complete` events include `platform: android` and an `anonymous_id` for guests. |
| Pre-roll pacing | A fixed ten-second timer in `startAd`; creative early `onEnd` is ignored, then the main stream is resumed and `/ads/impression` is sent. |
| Free listener controls | Auth gate, daily pick budget with persisted calendar-day counter and radio fallback, hourly skip gate, premium seek gate, preview stop and upgrade/login prompts. |
| Queue | Persisted with AsyncStorage; repeat, shuffle, play-next, append, remove, jump, reorder, clear and debounced `/me/queue` sync. |
| Background playback | `PlayerEngine` keeps `react-native-video` mounted at the app root with background/inactive playback flags. Progress and end events dispatch to the store. |
| Live radio | `stores/live.ts` joins LiveKit with generation checks, starts/stops native audio session, applies volume/mute to every remote audio publication, retries blocked audio, tracks permission changes, microphone, and raise/lower hand. |
| Offline manifest | `stores/downloads.ts` fetches the protected `playlist_url`, key and every encrypted segment into an app-private directory and rewrites a local m3u8; metadata and expiry are persisted by `lib/offline.ts`. Legacy `download_url` responses remain supported. |
| Offline playback | `offlineSource` returns a local file or local m3u8 URI first; expired packages are deleted. Native AVPlayer/ExoPlayer performs AES-HLS key use from the local key URI. |

The API returns encrypted AES-HLS packages rather than a plain media file. Segment and key fetching is done with the authenticated request and no master files are requested. Package deletion removes playlist, key and segment files. The native player must be configured for local m3u8/AES support on the target OS; if a platform build rejects local key URIs, add the corresponding platform DRM/key-provider module rather than falling back to a plain downloadable file.

`PlayerScreen` exposes artwork, ad countdown, seek (Premium), play/pause, previous/next, shuffle, repeat, mute and the full queue. `DownloadsScreen` exposes persisted package records and removal. `LiveScreen` exposes channel selection and the live interaction controls; the route can call `resumeAudio` when the OS audio session reports a blocked start.
