const path = require('path');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: options.entry,
    resolve: {
      ...options.resolve,
      extensions: ['.ts', '.js'],
    },
    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          test: /\.spec\.ts$/,
          use: 'ignore-loader',
        },
        {
          test: /\.test\.ts$/,
          use: 'ignore-loader',
        },
      ],
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        resourceRegExp: /\.spec\.ts$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /\.test\.ts$/,
      }),
    ],
  };
};








