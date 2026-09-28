# Bangladesh Betar mobile app

This is the React Native implementation of the Bangladesh Betar public portal. It uses the same Laravel v1 API as `bangladesh_betar_public` and provides native navigation for Listen, News, Watch, live radio, clips, accounts, subscriptions, library, playlists, comments, ratings, search, and downloads.

## Run it

```sh
npm install
npm start
npm run android
```

Create the environment files before building the app:

```sh
cp .env.example .env.development
cp .env.example .env.production
cp .env.example .env
```

Set `BETAR_API_BASE` in each file for the device or server that will use it. Android debug builds read `.env.development`; Android release builds read `.env.production`. iOS Debug builds read `.env` and iOS Release builds read `.env.production` through the Podfile configuration; set `ENVFILE` on an individual Xcode/CLI build when you need to override that mapping. These values are bundled into the app, so they must contain public configuration only and never API keys or other secrets.

For iOS, install CocoaPods after every native dependency change:

```sh
bundle install
bundle exec pod install
npm run ios
```

A physical phone must use the computer's LAN address in its environment file, for example `http://192.168.1.20:15000/api/v1`, and the Laravel server must accept that address. The Android emulator can reach a development server on the host through `http://10.0.2.2:15000/api/v1`; the iOS simulator can use `http://localhost:15000/api/v1`.

## Verification

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run lint
cd android && ./gradlew.bat :app:assembleDebug
```

The app stores auth, language, theme, and queue state with AsyncStorage. Media playback uses `react-native-video` with background audio. Live radio uses LiveKit and requires the API's LiveKit credentials. The native downloads screen only saves a file when the API returns a protected `download_url`; the current backend returns encrypted HLS manifests, so it refuses to write an insecure plaintext copy and reports that offline playback is unavailable for those assets.

For release builds, point `BETAR_API_BASE` at HTTPS and keep `BETAR_ANDROID_USES_CLEARTEXT=false` in `.env.production`. Replace the debug signing configuration with a release keystore before distributing the app.
