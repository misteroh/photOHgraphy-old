var path = require('path');

module.exports = {
    entry: path.resolve(__dirname, 'app/scripts/main.js'),
    output: {
      path: path.resolve(__dirname, 'app/scripts/'),
      filename: 'bundle.js'
    },
    devtool: 'eval',
    module: {
        loaders: [
            {
                test: /\.scss$/,
                include: /src/,
                loaders: [
                    'style',
                    'css',
                    // 'autoprefixer?browsers=last 3 versions',
                    'sass?outputStyle=expanded'
                ]
            }
        ]
    }
};
