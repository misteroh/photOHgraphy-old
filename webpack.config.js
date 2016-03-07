const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const VendorChunkPlugin = require('webpack-vendor-chunk-plugin');
const ModernizrWebpackPlugin = require('modernizr-webpack-plugin');

module.exports = {
    entry: {
        app: path.resolve(__dirname, 'app/index.js'),
        vendor: ['jquery', 'handlebars', 'photoswipe'],
      },
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: 'scripts/bundle.js'
    },
    devtool: 'eval',
    module: {
        loaders: [
            {
                test: /\.js?$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel', // 'babel-loader' is also a legal name to reference
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.scss$/,
                loaders: [
                    'style',
                    'css',
                    // 'autoprefixer?browsers=last 3 versions',
                    'sass?outputStyle=expanded'
                ]
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                loaders: [
                    'file?hash=sha512&digest=hex&name=images/[hash].[ext]',
                    'image-webpack?bypassOnDebug&optimizationLevel=7&interlaced=false'
                ]
            },
            {
                test: /\.woff$/i,
                loaders: [
                    'url?limit=10000&name=fonts/[hash].[ext]!'
                ]
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin('styles/main.css', {
            allChunks: true
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            Handlebars: "handlebars",
            PhotoSwipe: "photoswipe",
            PhotoSwipeUI_Default: "photoswipe/dist/photoswipe-ui-default.js"
        }),
        new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js', Infinity),
        new ModernizrWebpackPlugin()
    ]
};
