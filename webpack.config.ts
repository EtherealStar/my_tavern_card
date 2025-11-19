import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlInlineScriptWebpackPlugin from 'html-inline-script-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { Server } from 'socket.io';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { VueLoaderPlugin } from 'vue-loader';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const HTMLInlineCSSWebpackPlugin = require('html-inline-css-webpack-plugin').default;

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Config {
  port: number;
  entries: Entry[];
}
interface Entry {
  script: string;
  html?: string;
}

function parse_entry(script_file: string) {
  const html = path.join(path.dirname(script_file), 'index.html');
  if (fs.existsSync(html)) {
    return { script: script_file, html };
  }
  return { script: script_file };
}

function common_path(lhs: string, rhs: string) {
  const lhs_parts = lhs.split(path.sep);
  const rhs_parts = rhs.split(path.sep);
  for (let i = 0; i < Math.min(lhs_parts.length, rhs_parts.length); i++) {
    if (lhs_parts[i] !== rhs_parts[i]) {
      return lhs_parts.slice(0, i).join(path.sep);
    }
  }
  return lhs_parts.join(path.sep);
}

function glob_script_files() {
  const files: string[] = fs
    .globSync(`src/**/index.{ts,js}`)
    .filter(file => process.env.CI !== 'true' || !fs.readFileSync(path.join(__dirname, file)).includes('@no-ci'));

  const results: string[] = [];
  const handle = (file: string) => {
    const file_dirname = path.dirname(file);
    for (const [index, result] of results.entries()) {
      const result_dirname = path.dirname(result);
      const common = common_path(result_dirname, file_dirname);
      if (common === result_dirname) {
        return;
      }
      if (common === file_dirname) {
        results.splice(index, 1, file);
        return;
      }
    }
    results.push(file);
  };
  files.forEach(handle);
  return results;
}

const config: Config = {
  port: 6621,
  entries: glob_script_files().map(parse_entry),
};

let io: Server;
function watch_it(compiler: webpack.Compiler) {
  if (compiler.options.watch) {
    if (!io) {
      const port = config.port ?? 6621;
      io = new Server(port, { cors: { origin: '*' } });
      console.info(`[Listener] 已启动酒馆监听服务, 正在监听: http://0.0.0.0:${port}`);
      io.on('connect', socket => {
        console.info(`[Listener] 成功连接到酒馆网页 '${socket.id}', 初始化推送...`);
        socket.on('disconnect', reason => {
          console.info(`[Listener] 与酒馆网页 '${socket.id}' 断开连接: ${reason}`);
        });
      });
    }

    compiler.hooks.done.tap('updater', () => {
      console.info('\n[Listener] 检测到完成编译, 推送更新事件...');
      io.emit('iframe_updated');
    });
  }
}

function parse_configuration(entry: Entry, isFirst: boolean = false): (_env: any, argv: any) => webpack.Configuration {
  const script_filepath = path.parse(entry.script);
  const relativeDir = path.relative(path.join(__dirname, 'src'), script_filepath.dir);

  return (_env, argv) => ({
    experiments: {
      outputModule: true,
    },
    devtool: argv.mode === 'production' ? false : 'eval-source-map',
    watchOptions: {
      ignored: ['**/dist', '**/node_modules'],
    },
    entry: path.join(__dirname, entry.script),
    target: 'browserslist',
    output: {
      devtoolModuleFilenameTemplate: 'webpack://tavern_helper_template/[resource-path]?[loaders]',
      filename: `${script_filepath.name}.js`,
      path: path.join(__dirname, 'dist', relativeDir),
      chunkFilename: `${script_filepath.name}.[contenthash].chunk.js`,
      asyncChunks: true,
      chunkLoading: 'import',
      clean: true,
      // 修复 publicPath - 开发模式使用绝对路径以支持 iframe
      publicPath: argv.mode === 'development' ? `http://localhost:8080/${relativeDir}/` : 'auto',
      library: {
        type: 'module',
      },
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          use: 'vue-loader',
          exclude: /node_modules/,
        },
        {
          oneOf: [
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                onlyCompileBundledFiles: true,
                compilerOptions: {
                  noUnusedLocals: false,
                  noUnusedParameters: false,
                },
              },
              resourceQuery: /raw/,
              type: 'asset/source',
              exclude: /node_modules/,
            },
            {
              test: /\.(sa|sc)ss$/,
              use: ['postcss-loader', 'sass-loader'],
              resourceQuery: /raw/,
              type: 'asset/source',
              exclude: /node_modules/,
            },
            {
              test: /\.css$/,
              use: ['postcss-loader'],
              resourceQuery: /raw/,
              type: 'asset/source',
              exclude: /node_modules/,
            },
            {
              resourceQuery: /raw/,
              type: 'asset/source',
              exclude: /node_modules/,
            },
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                onlyCompileBundledFiles: true,
                compilerOptions: {
                  noUnusedLocals: false,
                  noUnusedParameters: false,
                },
              },
              exclude: /node_modules/,
            },
            {
              test: /\.html?$/,
              use: 'html-loader',
              exclude: /node_modules/,
            },
            {
              resourceQuery: /inline/,
              type: 'asset/inline',
              exclude: /node_modules/,
            },
            {
              test: /\.(png|jpe?g|gif|svg|webp)$/i,
              type: 'asset/resource',
              generator: {
                filename: 'assets/[name][ext]',
              },
            },
          ].concat(
            entry.html === undefined
              ? <any[]>[
                  {
                    test: /\.vue\.s(a|c)ss$/,
                    use: [
                      'vue-style-loader',
                      { loader: 'css-loader', options: { url: false } },
                      'postcss-loader',
                      'sass-loader',
                    ],
                    exclude: /node_modules/,
                  },
                  {
                    test: /\.vue\.css$/,
                    use: ['vue-style-loader', { loader: 'css-loader', options: { url: false } }, 'postcss-loader'],
                    exclude: /node_modules/,
                  },
                  {
                    test: /\.s(a|c)ss$/,
                    use: [{ loader: 'css-loader', options: { url: false } }, 'postcss-loader', 'sass-loader'],
                    exclude: /node_modules/,
                  },
                  {
                    test: /\.css$/,
                    use: [{ loader: 'css-loader', options: { url: false } }, 'postcss-loader'],
                    exclude: /node_modules/,
                  },
                ]
              : <any[]>[
                  {
                    test: /\.s(a|c)ss$/,
                    use: [
                      MiniCssExtractPlugin.loader,
                      { loader: 'css-loader', options: { url: false } },
                      'postcss-loader',
                      'sass-loader',
                    ],
                    exclude: /node_modules/,
                  },
                  {
                    test: /\.css$/,
                    use: [
                      MiniCssExtractPlugin.loader,
                      { loader: 'css-loader', options: { url: false } },
                      'postcss-loader',
                    ],
                    exclude: /node_modules/,
                  },
                ],
          ),
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js', '.tsx', '.jsx', '.css'],
      plugins: [
        new TsconfigPathsPlugin({
          extensions: ['.ts', '.js', '.tsx', '.jsx'],
          configFile: path.join(__dirname, 'tsconfig.json'),
        }),
      ],
      alias: {},
    },
    plugins: (entry.html === undefined
      ? [] // 修复:没有 HTML 时不需要 MiniCssExtractPlugin
      : [
          new HtmlWebpackPlugin({
            template: path.join(__dirname, entry.html),
            filename: path.parse(entry.html).base,
            scriptLoading: 'module',
            cache: false,
          }),
          new HtmlInlineScriptWebpackPlugin(),
          new MiniCssExtractPlugin(),
          new HTMLInlineCSSWebpackPlugin({
            styleTagFactory({ style }: { style: string }) {
              return `<style>${style}</style>`;
            },
          }),
        ]
    ).concat(
      { apply: watch_it },
      new VueLoaderPlugin(),
      // 复制静态资源文件
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(script_filepath.dir, 'assets'),
            to: path.join(__dirname, 'dist', relativeDir, 'assets'),
            noErrorOnMissing: true,
          },
        ],
      }),
    ),
    optimization: {
      minimize: true,
      runtimeChunk: false,
      splitChunks: false,
      minimizer: [
        argv.mode === 'production'
          ? new TerserPlugin({
              terserOptions: { format: { quote_style: 1 }, mangle: { reserved: ['_', 'toastr', 'YAML', '$', 'z'] } },
            })
          : new TerserPlugin({
              extractComments: false,
              terserOptions: {
                format: { beautify: true, indent_level: 2 },
                compress: false,
                mangle: false,
              },
            }),
      ],
    },
    externals: [],
    // 只在第一个配置中添加 devServer
    ...(isFirst
      ? {
          devServer: {
            static: {
              directory: path.join(__dirname, 'dist'),
              publicPath: '/',
              watch: true,
            },
            port: 8080,
            host: '0.0.0.0',
            hot: true,
            open: false,
            allowedHosts: 'all',
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
              'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
            },
            // 修复 historyApiFallback
            historyApiFallback: true,
            compress: true,
            client: {
              logging: 'info',
              overlay: {
                errors: true,
                warnings: false,
              },
            },
            // 添加日志查看实际访问路径
            onListening: function (devServer: any) {
              if (!devServer) {
                throw new Error('webpack-dev-server is not defined');
              }
              const port = devServer.server.address().port;
              console.log('\n[DevServer] 服务已启动:');
              console.log(`[DevServer] 访问地址: http://localhost:${port}`);
              console.log('[DevServer] 可用的页面:');
              config.entries.forEach(entry => {
                if (entry.html) {
                  const relativeDir = path.relative(path.join(__dirname, 'src'), path.dirname(entry.script));
                  const htmlName = path.basename(entry.html);
                  console.log(`  - http://localhost:${port}/${relativeDir}/${htmlName}`);
                }
              });
              console.log('');
            },
          },
        }
      : {}),
  });
}

export default config.entries.map((entry, index) => parse_configuration(entry, index === 0));
