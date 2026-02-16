#!/usr/bin/env node
/**
 * Build the embeddable chat widget into a single vanilla JS file.
 *
 * Usage: node scripts/build-widget.mjs
 *
 * Output: public/widget/chat-widget.js (minified IIFE, no dependencies)
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await build({
  entryPoints: [resolve(root, 'src/lib/widget/chat-widget.ts')],
  outfile: resolve(root, 'public/widget/chat-widget.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  platform: 'browser',
  sourcemap: false,
  logLevel: 'info'
});

console.log('✅ Widget built → public/widget/chat-widget.js');
