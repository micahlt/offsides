module.exports = {
  presets: ['babel-preset-expo'],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
    development: {
      plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
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
