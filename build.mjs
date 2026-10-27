// Builds the unpacked extension into dist/ (load it via chrome://extensions → "Load unpacked").
//   node build.mjs          one-off build
//   node build.mjs --watch  rebuild on change
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');

// Empty dist/ rather than deleting it: Flatpak Chrome reaches the folder through a document-portal
// path that stops working once the directory is recreated, which breaks the extension's reload.
mkdirSync('dist', { recursive: true });
for (const entry of readdirSync('dist')) rmSync(`dist/${entry}`, { recursive: true, force: true });
copyFileSync('src/manifest.json', 'dist/manifest.json');
copyFileSync('src/popup/popup.html', 'dist/popup.html');

const common = {
  outdir: 'dist',
  bundle: true,
  target: 'chrome120',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'text' },
  minify: !watch,
  logLevel: 'info',
};

const contexts = await Promise.all([
  // Classic scripts: the content script runs on every SA page, so it stays small.
  esbuild.context({
    ...common,
    entryPoints: { content: 'src/content/index.tsx', popup: 'src/popup/popup.tsx' },
    format: 'iife',
  }),
  // The overlay (Preact UI + AG Grid, ~1MB) as an ES module the content script imports on first
  // open. Listed in web_accessible_resources so import() can load it.
  esbuild.context({
    ...common,
    entryPoints: { panel: 'src/content/panel.tsx' },
    format: 'esm',
  }),
]);

if (watch) {
  await Promise.all(contexts.map(ctx => ctx.watch()));
} else {
  await Promise.all(contexts.map(ctx => ctx.rebuild()));
  await Promise.all(contexts.map(ctx => ctx.dispose()));
}
