// Starts the pilot server (memory store) and a headless Chromium for UI tests
// and screenshots. Map tile requests are aborted so the schematic fallback is
// exercised deterministically.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function startServer(env = {}) {
  const proc = spawn(process.execPath, [join(ROOT, 'src/server/index.js')], { env: { ...process.env, STORE: 'memory', PORT: '0', AS_OF: '2026-10-16', ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  const url = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += d;
      const m = buf.match(/http:\/\/[\d.]+:\d+/);
      if (m) resolve(m[0]);
    });
    proc.on('exit', (c) => reject(new Error('server exited ' + c)));
  });
  return { url, stop: () => proc.kill() };
}

export async function launch() {
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync);
  return chromium.launch(exe ? { executablePath: exe } : {});
}

export async function newPage(browser, { skipGuide = true, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1512, height: 1000 }, ...opts });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.abort());
  if (skipGuide) await ctx.addInitScript(() => { try { localStorage.setItem('noida-guide-done', 'true'); } catch {} });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}

export async function signIn(page, token) {
  await page.click('#roleBtn');
  await page.fill('#tok', token);
  await page.click('[data-form=signin] button[type=submit]');
  await page.waitForSelector('#modal.hide', { state: 'attached' });
  await page.waitForTimeout(200);
}
