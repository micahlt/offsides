const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
// notifier/ is a separate Node program for a server, not part of the app.
const notifierDir = path.join(__dirname, 'notifier').replace(/[/\\]/g, '[/\\\\]');

const config = {
    resolver: {
        sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'cjs'],
        blockList: [].concat(
            defaultConfig.resolver.blockList || [],
            new RegExp(`^${notifierDir}[/\\\\].*`),
        ),
    }
};

module.exports = mergeConfig(defaultConfig, config);
