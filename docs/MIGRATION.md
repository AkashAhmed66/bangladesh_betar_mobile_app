# Next.js to React Native route coverage

The native app keeps the web URL vocabulary so notification and shared links resolve to an equivalent mobile screen. `src/navigation.tsx` is the single route dispatcher; each feature screen owns its nested route parsing and API behavior.

| Web route | React Native destination |
|---|---|
| `/` | `HomeScreen` (home, live radio, continue listening, recommendations and editorial shelves) |
| `/browse` | `BrowseScreen` (trending, new releases, on-this-day and catalogue links) |
| `/search` | `SearchScreen` (suggestions and all catalogue result tabs) |
| `/songs`, `/albums`, `/artists`, `/programmes`, `/podcasts`, `/audiobooks` | `CatalogueListScreen` with filters, pagination and localized cards |
| `/songs/[id]`, `/albums/[id]`, `/artists/[id]`, `/programmes/[id]`, `/podcasts/[id]`, `/audiobooks/[id]` | `CatalogueDetailScreen` with tracks, episodes, playback and metadata |
| `/episodes/[id]`, `/podcast-episodes/[id]`, `/assets/[id]` | `CatalogueDetailScreen` detail/player view; asset details include engagement actions |
| `/live`, `/live/[id]` | `LiveScreen` radio channel selection, search, schedule/broadcast history and LiveKit interaction controls |
| `/watch`, `/watch/categories`, `/watch/category/[category]`, `/watch/[slug]`, `/watch/watchlist` | `WatchScreen` home/categories/detail/watchlist |
| `/watch/clips`, `/clips` | `ClipsScreen` paged clips, active autoplay, reactions and native sharing |
| `/watch/live`, `/watch/live/[id]` | `WatchLiveScreen` live television channel picker and native video playback |
| `/news`, `/news/latest`, `/news/category/[category]`, `/news/search`, `/news/[slug]` | `NewsScreen` newsroom, listing/search and article detail |
| `/news/about`, `/news/advertise`, `/news/contact`, `/news/editorial-policy`, `/news/privacy`, `/news/terms` | `NewsScreen` localized static information pages |
| `/account`, `/login`, `/register`, `/settings` | `AccountScreen` authentication, profile, preferences, subscription and payments |
| `/library`, `/favorites`, `/history`, `/playlists`, `/playlists/[id]` | `LibraryScreen` library lists, playlist CRUD/reorder, follow and public playlist engagement |
| `/downloads`, `/offline` | `DownloadsScreen` protected offline packages and local playback |
| `/premium` | `PremiumScreen` plans, trial, promo code and payment checkout |
| `/support`, `/assets/[id]/report` | `SupportScreen` feedback, issue/report forms and community inbox |
| `/ott` | `WatchScreen` (`/watch` equivalent, matching the web redirect) |

Web-only layout behavior such as desktop sidebars, hover states, browser clipboard, iframes and service-worker caching is represented by native navigation, the platform share sheet, external browser opening for unsupported embeds, and app-private offline storage. The server API routes and payloads remain the same as the Next.js application.
