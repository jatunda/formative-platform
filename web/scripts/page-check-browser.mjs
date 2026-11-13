// @ts-check
// What the browser layout checks share (the School Clock's, clock-check-browser.mjs,
// and the schedule pages', schedule-check.mjs): a Vite server on 127.0.0.1 (a
// free port) serving web/, a report folder per check, axe, page errors, and
// stopping everything on Ctrl-C so nothing is left running.
import { createServer } from 'vite';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

export const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const axeSource = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

/**
 * A check's report folder under web/ (gitignored), e.g. '.clock-check'.
 * @param {string} name
 */
export function checkOutput(name) {
  const outDir = resolve(webDir, name);
  return {
    /** Where screenshots and report.json go. */
    outDir,
    /** Empties outDir for a new run, so it holds only this run's files. */
    resetOutDir() {
      rmSync(outDir, { recursive: true, force: true });
      mkdirSync(outDir, { recursive: true });
    },
    /**
     * Writes every result to outDir/report.json and prints one ✗ line per failure.
     * @param {object[]} results @param {string[]} failures what failed, one line each
     */
    report(results, failures) {
      writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(results, null, 2));
      for (const line of failures) console.log(`✗ ${line}`);
    },
  };
}

/**
 * Starts a Vite server for web/ on 127.0.0.1 and runs `stop` on Ctrl-C (and
 * on a failed start). `stop` must close the server (via the returned close)
 * and anything else the check started.
 * @param {() => Promise<void>} stop
 * @returns {Promise<{ origin: string, close: () => Promise<void> }>}
 */
export async function startServer(stop) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { stop().finally(() => process.exit(130)); });
  }
  /** @type {import('vite').ViteDevServer | undefined} */
  let server;
  const close = async () => { await server?.close().catch(() => {}); };
  try {
    server = await createServer({ root: webDir, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('The Vite server is not listening on a port');
    return { origin: `http://127.0.0.1:${address.port}`, close };
  } catch (e) {
    await close();
    await stop();
    throw e;
  }
}

/**
 * Collects the page's uncaught errors from now on.
 * @param {import('playwright').Page} page @returns {string[]}
 */
export function recordPageErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/**
 * Runs axe on the page as it stands: one `id: N node(s)` line per violation.
 * @param {import('playwright').Page} page @returns {Promise<string[]>}
 */
export async function axeViolations(page) {
  await page.addScriptTag({ path: axeSource });
  return page.evaluate(async () => {
    // axe is the global the script tag above injects.
    const { axe } = /** @type {Window & { axe: typeof import('axe-core') }} */ (/** @type {unknown} */ (window));
    const { violations } = await axe.run(document);
    return violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`);
  });
}
