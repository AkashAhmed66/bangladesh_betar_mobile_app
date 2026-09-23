# Watch portal migration

The React Native Watch portal mirrors the Next.js `app/watch` and `app/clips` routes using the Laravel v1 API.

| Next.js route | Native destination |
| --- | --- |
| `/watch` | `WatchScreen` home with featured hero, live television promotion, nine editorial shelves, and categories |
| `/watch/categories` | `WatchScreen` category grid backed by `/portal-categories` |
| `/watch/category/[category]` | `WatchScreen` paginated category listing (`/watch?category=...`) |
| `/watch/[slug]` | `WatchScreen` detail with trailer, episode guide, premium/login playback gates, watchlist, share, related programmes, and episode reviews/ratings |
| `/watch/watchlist` | `WatchScreen` authenticated watchlist with search, show/episode filters, navigation, and removal |
| `/watch/clips` and `/clips` | `ClipsScreen` vertical paging video feed with autoplay, mute, reaction, share, hashtags, and next/previous controls |
| `/watch/live` and `/watch/live/[id]` | `WatchLiveScreen` (native LiveKit implementation; kept separate from catalogue/detail screens) |

Native-specific behavior:

- Video playback uses `react-native-video` with native seek, retry, buffering, mute, playback-rate, and ±10-second controls.
- Watchlist mutations use the same authenticated `/me/watchlist/toggle` and `/me/watchlist/{type}/{id}` contracts as the web portal.
- Episode video URLs are signed by the API and remain premium/authentication gated exactly as on the web portal.
- Clip reactions use `/reactions/watch_clip/{id}` and preserve optimistic UI with server reconciliation.
