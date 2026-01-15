module.exports = {
  presets: [
    ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    "nativewind/babel",
  ],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  },
  plugins: ['react-native-reanimated/plugin', ['babel-plugin-module-resolver',
    {
      alias: {
        'react-native-vector-icons': '@expo/vector-icons',
        '@react-native-vector-icons/material-design-icons':
          '@expo/vector-icons/MaterialCommunityIcons',
      },
    }]]
};
