const HtmlWebpackPlugin = require("html-webpack-plugin")
const webpack = require("webpack")
const path = require("path")

module.exports = (env, argv) => {
    return {
        entry: "./index.js",
        output: {
            path: path.resolve(__dirname, "./dist"),
            filename: "index_bundle.js",
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                "@babel/preset-env",
                                "@babel/preset-react",
                            ],
                        },
                    },
                },
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader"],
                },
                {
                    test: /\.(png|jpe?g|gif)$/i,
                    use: [
                        {
                            loader: "file-loader",
                        },
                    ],
                },
            ],
        },
        plugins: [new HtmlWebpackPlugin()],
        devServer: {
            liveReload: true,
            watchFiles: { paths: [__dirname + "/src"] },
            open: true,
            hot: false,
            client: {
                overlay: true,
            },
        },
    }
}
