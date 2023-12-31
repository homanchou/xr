const esbuild = require("esbuild");
const { typecheckPlugin } = require('@jgoz/esbuild-plugin-typecheck');
const falWorks = require("@fal-works/esbuild-plugin-global-externals");

const globals = {
  babylonjs: {
    varName: "BABYLON",
    type: "cjs",
  },
  "babylonjs-materials": {
    varName: "BABYLON",
    type: "cjs",
  },
  "babylonjs-gui": {
    varName: "BABYLON.GUI",
    type: "cjs",
  },
}

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const deploy = args.includes('--deploy');

const loader = {
  // Add loaders for images/fonts/etc, e.g. { '.svg': 'file' }
};

const plugins = [
  // Add and configure plugins here
  falWorks.globalExternals(globals),
  typecheckPlugin(),
];

// Define esbuild options
let opts = {
  entryPoints: ["js/app.ts"],
  bundle: true,
  format: "esm",
  splitting: true,
  logLevel: "info",
  target: "es2017",
  outdir: "../priv/static/assets",
  external: ["*.css", "fonts/*", "images/*"],
  loader: loader,
  plugins: plugins,
};

if (deploy) {
  opts = {
    ...opts,
    minify: true,
  };
}

if (watch) {
  opts = {
    ...opts,
    sourcemap: "inline",
  };
  esbuild
    .context(opts)
    .then((ctx) => {
      ctx.watch();
    })
    .catch((_error) => {
      process.exit(1);
    });
} else {
  esbuild.build(opts);
}