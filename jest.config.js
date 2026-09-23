module.exports = {
  preset: '@react-native/jest-preset',
  // lucide-react-native ships modern ESM and must be transformed by Jest just
  // like React Native's own packages.
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native-community|lucide-react-native|react-native-svg)/)',
  ],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^react-native-video$': '<rootDir>/__mocks__/react-native-video.js',
    '^@react-native-community/slider$': '<rootDir>/__mocks__/slider.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-keychain$': '<rootDir>/__mocks__/react-native-keychain.js',
    '^@livekit/react-native-webrtc$': '<rootDir>/__mocks__/livekit-webrtc.js',
    '^@livekit/react-native$': '<rootDir>/__mocks__/livekit-native.js',
    '^livekit-client$': '<rootDir>/__mocks__/livekit-client.js',
  },
};
