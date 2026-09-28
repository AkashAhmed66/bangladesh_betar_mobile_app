const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const fs = require('fs');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// When Android builds run through a short Windows `subst` drive, Node resolves
// dependencies back to the real project path. Keep that real path watched so
// Metro can hash and bundle those files reliably.
const projectRoot = __dirname;
const realProjectRoot = fs.realpathSync.native(projectRoot);
const config = {
  watchFolders: realProjectRoot === projectRoot ? [] : [realProjectRoot],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
