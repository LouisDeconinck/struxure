import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/** Placeholder in public/sw.js, replaced with the real version at build time. */
export const SW_VERSION_TOKEN = '__SW_VERSION__';

/**
 * Stamps the app version into the service worker's cache name.
 *
 * Without it the cache name stays fixed across releases. The worker's activate
 * handler deletes only caches whose name differs from the current one, so it
 * never clears its own, and returning visitors keep being served the previous
 * build's assets.
 *
 * This runs after the bundle is written rather than in generateBundle: files in
 * public/ are copied straight to the output directory and never enter the
 * Rollup bundle, so they cannot be rewritten through it — nor do they see
 * Vite's `define`, which is why the app's __APP_VERSION__ is not an option here.
 */
export function swVersionPlugin(version: string): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'struxure:sw-version',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      const swPath = path.resolve(config.root, config.build.outDir, 'sw.js');
      let source: string;
      try {
        source = await readFile(swPath, 'utf8');
      } catch {
        return; // No service worker in this build.
      }
      if (!source.includes(SW_VERSION_TOKEN)) {
        this.warn(`${SW_VERSION_TOKEN} not found in sw.js; cache name is not versioned`);
        return;
      }
      await writeFile(swPath, source.replaceAll(SW_VERSION_TOKEN, version));
    },
  };
}
