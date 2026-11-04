// Bundles react and react-dom from node_modules with esbuild into one classic script that sets
// window.React and window.ReactDOM, the globals project/components/bundle.js reads (it bundles no React).
// build_site.mjs writes it to lib/react.js of the site, render-previews.mjs to .render/lib/react.js;
// it is build output and never committed. It replaces the umd/ builds, which React 19 dropped (README, "Building").
// This module only returns the bundle: it imports no fs and passes `write: false`, so it writes and deletes nothing.
import * as esbuild from 'esbuild';

export const REACT_FILE = 'lib/react.js';

// `require`, not `import *`: the globals are the CommonJS export objects, with the keys of the old UMD globals
// and no `default`. React 19 has createRoot only in react-dom/client; on 18 both export the same function.
const ENTRY = `window.React = require('react');
window.ReactDOM = Object.assign({}, require('react-dom'), require('react-dom/client'));
`;

// The bundle of the react and react-dom installed under <root>/node_modules:
// { contents: Uint8Array, inputs: the metafile input paths, relative to root }.
// Rejects when the bundle would hold a second copy of react or react-dom (two React on one page).
export async function bundleReact(root) {
  const result = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: root, sourcefile: 'react-entry.js', loader: 'js' },
    absWorkingDir: root,
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2019',
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'eof', // keeps the @license React headers of react, react-dom and scheduler
    metafile: true,
    write: false,
    logLevel: 'silent',
  });
  const inputs = Object.keys(result.metafile.inputs);
  for (const name of ['react', 'react-dom']) {
    // Input paths are relative to the working directory, so they are matched by suffix.
    const copies = inputs.filter((p) => new RegExp(`(^|/)node_modules/${name}/index\\.js$`).test(p));
    if (copies.length !== 1) throw new Error(`react-bundle: expected one copy of ${name} in the bundle, found ${copies.length}: ${copies.join(', ') || 'none'}`);
  }
  return { contents: result.outputFiles[0].contents, inputs };
}
