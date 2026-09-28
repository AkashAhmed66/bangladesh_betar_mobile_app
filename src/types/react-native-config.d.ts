declare module 'react-native-config' {
  interface NativeConfig {
    BETAR_API_BASE?: string;
    BETAR_ENV?: string;
    BETAR_ANDROID_USES_CLEARTEXT?: string;
    BETAR_APP_VERSION?: string;
    BETAR_VERSION_CODE?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
