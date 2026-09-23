# News portal migration

The native News portal is implemented in `src/screens/NewsScreen.tsx` and is
selected by the shared router for every `/news` route. The screen uses the
same Laravel API contracts as the Next.js portal and reads the English and
Bangla dictionaries from `src/locales/en.json` and `src/locales/bn.json`.

| Next.js route | React Native destination |
| --- | --- |
| `/news` | News home: featured lead, selected stories, latest updates, most-read ranking, and newsroom discovery filters |
| `/news/[slug]` | Article detail: localized headline/summary/body, view counter, reactions, share, media gallery, highlights, related stories, and ranking |
| `/news/latest` | Paginated latest-news listing |
| `/news/category/[category]` | Category listing with localized category navigation, sort, filters, and pagination |
| `/news/search` | News search listing with query, sort, category chips, empty/error/retry states, and pagination |
| `/news/about` | Localized newsroom information page |
| `/news/contact` | Localized contact page |
| `/news/advertise` | Localized advertising information page |
| `/news/privacy` | Localized privacy page |
| `/news/terms` | Localized terms page |
| `/news/editorial-policy` | Localized editorial policy page |

The web-only ad slots and browser iframe/PDF presentation are represented by
native spacing and external media actions. Images use the article media URL;
video and audio use the shared native player; YouTube, documents, and unknown
media types open through the device URL handler. Article views are counted
once per installation per article using AsyncStorage, matching the web
session-level behavior while avoiding duplicate counts during native rerenders.

