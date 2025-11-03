module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove all console logs in production
      ...(isProduction ? ['transform-remove-console'] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
