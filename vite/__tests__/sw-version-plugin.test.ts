import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { swVersionPlugin, SW_VERSION_TOKEN } from '../sw-version-plugin';
import type { ResolvedConfig } from 'vite';

let root: string;

/** Drives the plugin's build hooks against a real output directory. */
async function run(swSource: string | null, version = '1.2.3') {
  const plugin = swVersionPlugin(version);
  const outDir = 'dist';
  await mkdir(path.join(root, outDir), { recursive: true });
  if (swSource !== null) {
    await writeFile(path.join(root, outDir, 'sw.js'), swSource);
  }

  const warnings: string[] = [];
  const config = { root, build: { outDir } } as ResolvedConfig;
  (plugin.configResolved as (c: ResolvedConfig) => void).call(null as never, config);

  const closeBundle = plugin.closeBundle;
  const fn = typeof closeBundle === 'function' ? closeBundle : closeBundle!.handler;
  await fn.call({ warn: (m: string) => warnings.push(m) } as never);

  const written = swSource === null
    ? null
    : await readFile(path.join(root, outDir, 'sw.js'), 'utf8');
  return { written, warnings };
}

describe('swVersionPlugin', () => {
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'struxure-sw-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('stamps the version into the cache name', async () => {
    const { written } = await run(`const CACHE_NAME = 'struxure-${SW_VERSION_TOKEN}';`);
    expect(written).toBe("const CACHE_NAME = 'struxure-1.2.3';");
  });

  it('replaces every occurrence', async () => {
    const { written } = await run(`${SW_VERSION_TOKEN} ${SW_VERSION_TOKEN}`);
    expect(written).toBe('1.2.3 1.2.3');
  });

  it('gives consecutive releases distinct cache names', async () => {
    const a = await run(`struxure-${SW_VERSION_TOKEN}`, '0.3.0');
    const b = await run(`struxure-${SW_VERSION_TOKEN}`, '0.3.1');
    // Equal names would leave the activate handler unable to evict the old cache.
    expect(a.written).not.toBe(b.written);
  });

  it('warns rather than silently shipping an unversioned cache', async () => {
    const { written, warnings } = await run("const CACHE_NAME = 'struxure-v1';");
    expect(written).toBe("const CACHE_NAME = 'struxure-v1';");
    expect(warnings.join(' ')).toContain(SW_VERSION_TOKEN);
  });

  it('does nothing when the build has no service worker', async () => {
    const { warnings } = await run(null);
    expect(warnings).toEqual([]);
  });
});
