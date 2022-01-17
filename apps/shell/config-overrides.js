const path = require("path");
const rewireWebpackBundleAnalyzer = require("react-app-rewire-webpack-bundle-analyzer");
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");
const TsConfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
  webpack: (config, env) => {
    if (env === "production") {
      config = rewireWebpackBundleAnalyzer(config, env, {
        analyzerMode: "static",
        reportFilename: "report.html",
      });
    }

    // Remove guard against importing modules outside of `src`.
    // Needed for workspace projects.
    config.resolve.plugins = config.resolve.plugins.filter((plugin) => !(plugin instanceof ModuleScopePlugin));

    // Add support for importing workspace projects.
    config.resolve.plugins.push(
      new TsConfigPathsPlugin({
        configFile: path.resolve(__dirname, "tsconfig.json"),
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        mainFields: ["module", "main"],
      }),
    );

    // Replace include option for babel loader with exclude
    // so babel will handle workspace projects as well.
    config.module.rules.forEach((r) => {
      if (r.oneOf) {
        const babelLoader = r.oneOf.find((rr) => rr && rr.loader && rr.loader.indexOf("babel-loader") !== -1);
        babelLoader.exclude = /node_modules/;
        delete babelLoader.include;
      }
    });

    if (env === "production") {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          vendor: {
            chunks: "initial",
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            reuseExistingChunk: true,
            priority: -10,
          },
        },
      };
    }

    /**
     * Do not disable component profiling in production, for a better learning experience
     * @link https://kentcdodds.com/blog/profile-a-react-app-for-performance#update-the-webpack-config-for-production-profiling
     */
    config.resolve.alias["react-dom$"] = "react-dom/profiling";
    config.resolve.alias["scheduler/tracing"] = "scheduler/tracing-profiling";

    return config;
  },
  paths: (paths) => {
    // Rewrite dist folder to where Nx expects it to be.
    paths.appBuild = path.resolve(__dirname, "../../dist");
    return paths;
  },
  jest: (config) => {
    config.resolver = "@nrwl/jest/plugins/resolver";
    return config;
  },
};
