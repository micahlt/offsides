module.exports = {
  presets: ['module:@react-native/babel-preset'],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
    development: {
      plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
    },
  },
  plugins: ['react-native-reanimated/plugin']
};
