import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('handoff desktop runtime reference', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const metrics = { longTasks: [] as number[], commits: 0 };
    (window as any).__handoff = metrics;
    new PerformanceObserver(list => list.getEntries().forEach(e => metrics.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject: () => 1, checkDCE() {}, onCommitFiberRoot() { metrics.commits++; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {} };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const results: object[] = [];
  const cdp = await page.context().newCDPSession(page);
  const browserVersion = await cdp.send('Browser.getVersion');
  for (const route of ['/explore', '/artist/21', '/search', '/messages', '/received', '/saved', '/publish', '/profile?create=project', '/discovery?post=post-11']) {
    for (const cache of ['cold', 'warm']) {
      const requests: string[] = [];
      const listener = (request: any) => { if (request.url().includes('/api/')) requests.push(new URL(request.url()).pathname); };
      page.on('request', listener);
      if (cache === 'cold') await cdp.send('Network.clearBrowserCache');
      const start = Date.now();
      await page.goto(route);
      if (route.startsWith('/discovery')) await expect(page.locator('article[data-active=true] .discovery-video-tap')).toBeEnabled({ timeout: 20000 });
      else if (route === '/explore') await expect(page.locator('.opportunity-card-slot[data-ready=true] article').first()).toBeVisible({ timeout: 20000 });
      else if (route === '/artist/21') await expect(page.getByRole('heading', { name: 'Discography', exact: true })).toBeVisible({ timeout: 15000 });
      else if (route === '/search') await expect(page.locator('#site-search')).toBeEnabled();
      else if (route === '/messages') await expect(page.locator('a[href^="/messages/general/"]').first()).toBeVisible();
      else if (route === '/received') await expect(page.locator('article').first()).toBeVisible();
      else if (route === '/saved') await expect(page.locator('article').first().or(page.getByText('No saved publications yet.', { exact: true }))).toBeVisible();
      else if (route === '/publish') await expect(page.getByLabel('Audio or video', { exact: true })).toBeVisible();
      else await expect(page.getByLabel('TITLE', { exact: true })).toBeVisible();
      const interactiveMs = Date.now() - start;
      await page.waitForTimeout(1500);
      results.push({ route, cache, interactiveMs, elapsedMs: Date.now() - start, requests, ...await page.evaluate(() => ({ ...(window as any).__handoff, media: document.querySelectorAll('audio,video').length, navigation: performance.getEntriesByType('navigation')[0]?.toJSON() })) });
      page.off('request', listener);
      if (cache === 'warm') await page.screenshot({ path: info.outputPath(`${route.replace(/[^a-z0-9]/gi, '-')}-${process.env.HANDOFF_PHASE ?? 'candidate'}.png`), animations: 'disabled' });
    }
  }
  await mkdir('.data/handoff-evidence', { recursive: true });
  await writeFile(`.data/handoff-evidence/runtime-${process.env.HANDOFF_PHASE ?? 'candidate'}.json`, JSON.stringify({ browserVersion, viewport: '1440x900', interpretation: 'One cold/warm pass per route; elapsed includes 1500ms observation and intentional Discovery intro. Not a statistical performance claim.', results, errors }, null, 2));
  expect(errors).toEqual([]);
});
