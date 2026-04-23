// craco.config.js
const path = require("path");

module.exports = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig, { env }) => {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      // P-09: Bundle splitting — separa vendor (React, axios etc.) do código da app
      // Reduz re-download quando apenas o código da app muda
      if (env === 'production') {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Vendor: React, ReactDOM, react-router — raramente mudam
              vendor: {
                test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|axios)[\\/]/,
                name: 'vendor',
                chunks: 'all',
                priority: 20,
              },
              // UI: lucide-react, tailwind, shadcn — mudam ocasionalmente
              ui: {
                test: /[\\/]node_modules[\\/](lucide-react|@radix-ui|class-variance-authority|clsx|tailwind-merge)[\\/]/,
                name: 'ui',
                chunks: 'all',
                priority: 10,
              },
              // Demais node_modules
              commons: {
                test: /[\\/]node_modules[\\/]/,
                name: 'commons',
                chunks: 'all',
                priority: 5,
                minChunks: 2,
              },
            },
          },
          // Separar runtime para melhorar cache
          runtimeChunk: { name: 'runtime' },
        };
      }

      return webpackConfig;
    },
  },
};
