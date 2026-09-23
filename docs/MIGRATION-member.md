# Member and engagement migration

The native router maps the following Next routes to the member screens:

| Web route | Native route and coverage |
| --- | --- |
| `/login` | `AccountScreen` email/password and phone OTP request/verify, API errors and redirect |
| `/register` | `AccountScreen` required fields, locale, terms acceptance, API errors and redirect |
| `/account` | `AccountScreen` profile name/phone/email, locale, personalisation opt-out, subscription status/cancel, payments, sign-out and links |
| `/premium` | `PremiumScreen` plans, monthly/annual pricing, feature list, trial, bKash/Nagad/Rocket/card checkout and promo code |
| `/library` | `LibraryScreen` quick links, playlist creation, playlist list and follows |
| `/favorites` | `LibraryScreen` favourites list and play-all |
| `/history` | `LibraryScreen` listening history, progress and resume |
| `/playlists` | `LibraryScreen` playlist list and creation |
| `/playlists/[id]` | `LibraryScreen` public/member loading, play-all, follow, reactions/share, owner edit/delete, remove and reorder items |
| `/support` | `SupportScreen` guest feedback, issue report, signed-in Community Inbox status and sign-in prompt |
| `/assets/[id]/report` | `SupportScreen` asset context, auth gate, reason/details and exact `/reports` payload (router passes the full pathname) |
| recording engagement components | `Engagement` favourite, like/dislike reactions, native Share, add-to-playlist, report, rating, comments and own-comment delete |

API payloads mirror the Laravel V1 routes. Playlist item additions use `playable_type: audio_asset` and the asset id; reorder uses the backend `order` array of playlist item ids. The native app uses the platform share sheet instead of browser clipboard/URL APIs. Date and currency presentation is intentionally compact for the mobile layout.


