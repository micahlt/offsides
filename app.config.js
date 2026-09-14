module.exports = {
  name: 'Offsides',
  slug: 'offsides',
  version: '1.0.1',
  platforms: ['android'],
  githubUrl: 'https://github.com/micahlt/offsides',
  icon: './src/assets/icon.png',
  newArchEnabled: true,
  android: {
    package: 'com.micahlindley.offsides',
    versionCode: 61,
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      monochromeImage: './src/assets/adaptive-icon-mono.png',
      backgroundColor: '#3DDC84',
    },
    googleServicesFile: './google-services.json',
    splash: {
      backgroundColor: '#3DDC84',
      image: './src/assets/Offsides.png',
    },
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    'expo-font',
    'expo-asset',
    '@react-native-firebase/app',
    '@react-native-firebase/crashlytics',
  ],
  assetBundlePatterns: [
    '**/*',
    './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/*.ttf',
  ],
};
