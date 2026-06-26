// biome-ignore lint/correctness/noNodejsModules: webpack config
import { resolve } from 'node:path';
import CssnanoPlugin from 'cssnano';
import HtmlWebpackHarddiskPlugin from 'html-webpack-harddisk-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const distPath = 'webpack-dist';
const styleLoader = MiniCssExtractPlugin.loader;
const postcssLoader = {
  loader: 'postcss-loader',
  options: {
    postcssOptions: {
      plugins: [
        [
          CssnanoPlugin(),
        ],
      ],
    },
  },
};

const config = {
  resolve: {
    extensions: [
      '.ts',
      '.js',
    ],
  },
  entry: {
    app: './src/ts/main.ts',
  },
  output: {
    path: resolve(import.meta.dirname, distPath),
  },
  // optimization: {
  //   splitChunks: {
  //     chunks: 'all',
  //     cacheGroups: {
  //       vendors: {
  //         test: /[\\/](node_modules|deps)[\\/]/,
  //       },
  //     },
  //   },
  // },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          styleLoader,
          'css-loader',
          postcssLoader,
        ],
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          styleLoader,
          'css-loader',
          postcssLoader,
          'sass-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 16_384,
              outputPath: `../${distPath}/img`,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: `../${distPath}/index.html`,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
      },
      alwaysWriteToDisk: true,
    }),
    new HtmlWebpackHarddiskPlugin(),
    new MiniCssExtractPlugin(),
  ],
  devServer: {
    static: `./${distPath}`,
    open: true,
  },
};

// biome-ignore lint/style/noDefaultExport: webpack config
export default config;
