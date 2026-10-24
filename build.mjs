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

const ctx = await esbuild.context({
  entryPoints: { content: 'src/content/index.tsx', popup: 'src/popup/popup.tsx' },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.css': 'text' },
  minify: !watch,
  logLevel: 'info',
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
