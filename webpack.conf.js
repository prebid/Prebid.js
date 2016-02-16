var RewirePlugin = require('rewire-webpack');
module.exports = {
    output: {
        filename: 'prebid.js'
    },
    resolve: {
        modulesDirectories: ['', 'node_modules', 'src', 'adapters']
    },
    resolveLoader: {
        modulesDirectories: ['loaders', 'node_modules']
    },
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            }
        ]
    },
    plugins: [
        new RewirePlugin()
    ]
};
