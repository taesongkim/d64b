module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // 'nativewind/babel', // Temporarily disabled due to PostCSS issue
      // Reanimated plugin will be added when we install it in future task
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/store': './src/store',
            '@/services': './src/services',
            '@/utils': './src/utils',
            '@/database': './src/database',
            '@/assets': './assets',
          },
        },
      ],
    ],
  };
};