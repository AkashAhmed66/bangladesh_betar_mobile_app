# Bangladesh Betar mobile app

This is the React Native implementation of the Bangladesh Betar public portal. It uses the same Laravel v1 API as `bangladesh_betar_public` and provides native navigation for Listen, News, Watch, live radio, clips, accounts, subscriptions, library, playlists, comments, ratings, search, and downloads.

## Run it

```sh
npm install
npm start
npm run android
```

For iOS, install CocoaPods after every native dependency change:

```sh
bundle install
bundle exec pod install
npm run ios
```

The default development API is `http://10.0.2.2:15000/api/v1` on Android and `http://localhost:15000/api/v1` on iOS Simulator. Override it before starting Metro with `BETAR_API_BASE`, or at runtime with `global.__BETAR_API_BASE__`. A physical phone must use the computer's LAN address, for example `http://192.168.1.20:15000/api/v1`, and the Laravel server must accept that address.

## Verification

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run lint
cd android && ./gradlew.bat :app:assembleDebug
```

The app stores auth, language, theme, and queue state with AsyncStorage. Media playback uses `react-native-video` with background audio. Live radio uses LiveKit and requires the API's LiveKit credentials. The native downloads screen only saves a file when the API returns a protected `download_url`; the current backend returns encrypted HLS manifests, so it refuses to write an insecure plaintext copy and reports that offline playback is unavailable for those assets.

For release builds, point `BETAR_API_BASE` at HTTPS, set `usesCleartextTraffic` to `false` in the production Android flavor, and replace the debug signing configuration with a release keystore.
