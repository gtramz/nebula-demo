import { test, expect, type Page } from '@playwright/test';
import type { PresentationCatalog } from '../lib/local/src/presentation-catalog';

const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
async function call(page: Page, path: string, data?: unknown) {
  const response = await page.request.fetch(path, { method: data === undefined ? 'GET' : 'POST', headers, data });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function preparedCatalog(page: Page) {
  await call(page, '/api/presentation/reset', { confirm: true });
  const status = await call(page, '/api/presentation');
  expect(status.principalId).toBe(21);
  expect(status.accounts).toEqual(expect.arrayContaining([expect.objectContaining({id:21,name:'CHILZ'}),expect.objectContaining({id:19,name:'Sol Rivera'})]));
  const catalog: PresentationCatalog = status.catalog;
  expect(catalog.artistId).toBe(21);
  expect(catalog.releases).toHaveLength(10);
  expect(catalog.releases.flatMap(release => release.tracks)).toHaveLength(14);
  expect(new Set(catalog.releases.map(release => release.projectId)).size).toBe(10);
  return catalog;
}

test('CHILZ catalog, silent preview and contextual return work at Artist breakpoints', async ({ page }, info) => {
  test.setTimeout(100000);
  const catalog = await preparedCatalog(page), release = catalog.releases.find(item => item.title === 'Monkey Business')!;
  const example = (await call(page, '/api/presentation')).featuredRemix;
  const permittedMedia = new Set([example.original.mediaId, example.original.coverId, example.remix.mediaId, example.remix.coverId].map(id=>`/media/${id}`));
  expect(release.type).toBe('EP'); expect(release.tracks).toHaveLength(5);
  const errors: string[] = [], external: string[] = [], media: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/media/')) media.push(request.url()); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
    external.push(url.href); return route.abort();
  });
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/profile');
    await page.getByRole('link', {name:'View public profile',exact:true}).click();
    await expect(page).toHaveURL('/artist/21');
    await expect(page.getByRole('heading', {name:'CHILZ',exact:true})).toBeVisible();
    if (width === 390) await expect(page.getByRole('tab', {name:'Overview',exact:true})).toHaveAttribute('aria-selected','true');
    await page.getByRole('tab', {name:'Overview',exact:true}).click();
    await page.getByRole('button', {name:'View discography',exact:true}).click();
    await expect(page.getByRole('tab', {name:'Music',exact:true})).toHaveAttribute('aria-selected','true');
    const discography = page.getByRole('region', {name:'Discography',exact:true});
    await expect(discography.getByRole('heading',{level:3})).toHaveCount(10);
    await expect(discography).toContainText('10 releases');
    await expect(page.getByText(/monthly listeners|343,504|63,092/)).toHaveCount(0);
    const link = discography.locator(`a[href="/project/${release.projectId}"]`);
    await expect(link).toContainText('2022 · EP');
    await link.click();
    await expect(page).toHaveURL(`/project/${release.projectId}`);
    await expect(page.getByRole('heading', {name:'Monkey Business',exact:true})).toBeVisible();
    const songs = page.getByRole('region', {name:'Release songs',exact:true});
    await expect(songs.getByRole('button')).toHaveCount(5);
    for (const track of release.tracks) await expect(songs.getByRole('button').filter({hasText:track.title})).toBeVisible();
    await expect(page.getByRole('button',{name:/back this project|support symbolically|submit proposal|remix|download/i})).toHaveCount(0);
    await expect(page.getByRole('link',{name:/download/i})).toHaveCount(0);
    await expect(page.getByText(/\bUSD\s*[0-9]|[0-9]+%\s*(raised|royalties)|\bGOAL\s*[0-9]/i)).toHaveCount(0);
    await expect(page.locator('audio,video')).toHaveCount(0);
    const cover = page.getByAltText('Monkey Business artwork', {exact:true});
    await expect.poll(() => cover.evaluate((image:HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const preview = page.getByRole('region', {name:'Track player: Feelz',exact:true});
    await expect(preview).not.toContainText(/Silent demo preview|No audio included/);
    await preview.getByRole('button',{name:'Play: Feelz',exact:true}).click();
    const position = preview.getByRole('slider',{name:'Track position for Feelz',exact:true});
    await expect.poll(async () => Number(await position.inputValue())).toBeGreaterThan(.2);
    await preview.getByRole('button',{name:'Pause: Feelz',exact:true}).click();
    const paused = await position.inputValue();
    await page.waitForTimeout(220); // Allow two transport ticks to detect an uncleared interval.
    await expect(position).toHaveValue(paused);
    await position.fill('120');
    await expect(preview).toContainText('2:00');
    await expect(preview.getByRole('button',{name:'Play: Feelz',exact:true})).toBeVisible();
    await songs.getByRole('button').filter({hasText:'Disco Monkey'}).click();
    await expect(page.getByRole('region',{name:'Track player: Disco Monkey',exact:true})).toBeVisible();
    await expect(page.getByRole('slider',{name:'Track position for Disco Monkey',exact:true})).toHaveValue('0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`catalog-release-${width}.png`),fullPage:true});
    await page.getByRole('link',{name:'Back to artist',exact:true}).click();
    await expect(page).toHaveURL('/artist/21');
    await expect(discography).toBeVisible();
    await page.getByRole('tab',{name:'Projects',exact:true}).click();
    await expect(page.getByRole('tabpanel',{name:'Projects',exact:true}).locator(`a[href="/project/${release.projectId}"]`)).toHaveCount(1);
    await expect(page.getByRole('tabpanel',{name:'Projects',exact:true}).getByText(/\bUSD\s*[0-9]|[0-9]+%\s*(raised|royalties)/i)).toHaveCount(0);
  }
  // The profile's separate LUNA example has real supplied recordings. Spotify catalog
  // pages above contain no media elements and must not invent additional recordings.
  expect(media.filter(url=>!permittedMedia.has(new URL(url).pathname))).toEqual([]);
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('LUNA credits both original artists, plays real supplied recordings and compares exclusively', async ({page},info) => {
  test.setTimeout(90000);
  await preparedCatalog(page);
  const status = await call(page, '/api/presentation'), example = status.featuredRemix;
  const { original, remix } = example;
  expect(original.title).toBe('luna'); expect(remix.title).toBe('luna - chilz remix');
  expect(original.artistIds).toHaveLength(2); expect(remix.artistIds).toEqual([status.catalog.artistId]);
  const source = await call(page, `/api/publications/${original.postId}`), result = await call(page, `/api/publications/${remix.postId}`);
  expect(source.media.id).toBe(original.mediaId); expect(result.media.id).toBe(remix.mediaId);
  expect(source.media.kind).toBe('audio'); expect(result.media.kind).toBe('audio');
  expect(result.remix.sourceId).toBe(original.postId); expect(result.remix.endSeconds).toBeCloseTo(175.287438, 4);
  expect(result.allowRemix).toBe(false);
  const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  for (const artistId of original.artistIds) {
    await page.goto(`/artist/${artistId}`);
    await expect(page.getByRole('heading',{name:status.accounts.find((a:any)=>a.id===artistId).name,exact:true})).toBeVisible();
    const featured=page.getByRole('region',{name:'Featured recording: luna',exact:true});
    await expect(featured).toBeVisible();
    await expect(featured.getByRole('link',{name:'gramz',exact:true})).toHaveAttribute('href',`/artist/${original.artistIds[0]}`);
    await expect(featured.getByRole('link',{name:'SANNFERNNA',exact:true})).toHaveAttribute('href',`/artist/${original.artistIds[1]}`);
    await expect(featured.locator('audio')).toHaveAttribute('src',source.media.url);
  }
  for (const width of [390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(`/artist/${status.catalog.artistId}`);
    const featured=page.getByRole('region',{name:'Featured recording: luna - chilz remix',exact:true});
    await expect(featured).toBeVisible();
    await featured.getByRole('button',{name:'Play luna - chilz remix',exact:true}).click();
    await expect.poll(()=>featured.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(.1);
    await featured.getByRole('slider',{name:'Seek luna - chilz remix',exact:true}).fill('74');
    await expect.poll(()=>featured.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThanOrEqual(74);
    await featured.getByRole('button',{name:'Pause luna - chilz remix',exact:true}).click();
    await expect(featured.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).resolves.toBe(true);
    await featured.getByRole('link',{name:'View project: luna - chilz remix',exact:true}).click();
    await expect(page).toHaveURL(`/project/${remix.projectId}`);
    await expect(page.getByRole('heading',{name:'luna - chilz remix',exact:true,level:1})).toBeVisible();
    await expect(page.getByText('Silent demo preview',{exact:true})).toHaveCount(0);
    await expect(page.getByText(/\bUSD\s*[0-9]|[0-9]+%\s*(raised|royalties)/i)).toHaveCount(0);
    await page.getByText('Compare versions',{exact:true}).click();
    const comparison = page.getByLabel('Compare Original · gramz & SANNFERNNA',{exact:true});
    await expect(comparison).toHaveAttribute('src',source.media.url);
    const projectPlayer=page.getByRole('region',{name:'Featured recording: luna - chilz remix',exact:true});
    await projectPlayer.getByRole('button',{name:'Play luna - chilz remix',exact:true}).click();
    await expect.poll(()=>projectPlayer.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(.1);
    await comparison.evaluate((a:HTMLAudioElement)=>a.play());
    await expect.poll(()=>comparison.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(.1);
    await expect.poll(()=>projectPlayer.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
    await page.getByRole('slider',{name:/Comparison position/}).fill('65');
    await page.getByRole('button',{name:'CHILZ remix',exact:true}).click();
    const comparedRemix=page.getByLabel('Compare CHILZ remix',{exact:true});
    await expect(comparedRemix).toHaveAttribute('src',result.media.url);
    await expect.poll(()=>comparedRemix.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThanOrEqual(65);
    expect(await page.locator('audio').evaluateAll((items:HTMLAudioElement[])=>items.filter(a=>!a.paused).length)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`luna-recording-${width}.png`),fullPage:true});
    await page.getByRole('link',{name:'Back to artist',exact:true}).click();
    await expect(page).toHaveURL(`/artist/${status.catalog.artistId}`);
    await expect(page.getByRole('region',{name:'Featured recording: luna - chilz remix',exact:true})).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('catalog is not invented funding and Sol remains available with his own activity', async ({page}) => {
  const catalog = await preparedCatalog(page);
  const home = await call(page,'/api/opportunities/projects');
  const releaseIds = new Set(catalog.releases.map(release=>release.projectId));
  expect(home.items.some((item:any)=>releaseIds.has(item.project.id))).toBe(false);
  await page.goto('/presentation');
  await expect(page.getByRole('button',{name:'CHILZ Artist',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sol Rivera Artist',exact:true}).click();
  await expect(page).toHaveURL('/explore');
  expect((await call(page,'/api/session')).user.name).toBe('Sol Rivera');
  await page.goto('/profile');
  await page.getByRole('link',{name:'View public profile',exact:true}).click();
  await expect(page).toHaveURL('/artist/19');
  await expect(page.getByRole('heading',{name:'Sol Rivera',exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Discography',exact:true})).toHaveCount(0);
  await page.goto('/messages/offer/1');
  await expect(page.getByRole('button',{name:'Your proposal',exact:true})).toBeVisible();
  await page.goto('/presentation');
  await page.getByRole('button',{name:'CHILZ Artist',exact:true}).click();
  await expect(page).toHaveURL('/explore');
  expect((await call(page,'/api/session')).user.name).toBe('CHILZ');
  await page.goto('/messages/offer/1');
  await expect(page.getByRole('button',{name:'Your proposal',exact:true})).toHaveCount(0);
  await page.goto('/artist/21');
  await page.getByRole('tab',{name:'Music',exact:true}).click();
  await expect(page.getByRole('region',{name:'Discography',exact:true}).getByRole('heading',{level:3})).toHaveCount(10);
});
