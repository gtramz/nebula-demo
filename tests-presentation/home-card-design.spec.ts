import { test, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 20000 });
const headers = { Origin: 'http://127.0.0.1:4177', 'X-Nebula-Request': '1' };
test.beforeEach(async ({ page }) => { expect((await page.request.post('/api/presentation/reset', { headers, data: { confirm: true } })).ok()).toBe(true); });
test('artist cards fit target viewports and align rows without truncating controls', async ({ page }, info) => {
  const sizes = info.project.name === 'mobile' ? [[375,812],[390,844],[430,932]] : [[1280,900],[1440,1000]];
  await page.goto('/explore');
  const cards = page.locator('.opportunity-home article.opportunity-card');
  await expect(cards.first()).toBeVisible();
  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    await cards.first().scrollIntoViewIfNeeded();
    const metrics = await page.locator('.opportunity-home').evaluate(root => {
      const grid=root.querySelector(':scope > .opportunity-grid')!;
      const items=[...grid.querySelectorAll('article')].slice(0,4);
      return { width:root.clientWidth-parseFloat(getComputedStyle(root).paddingLeft)-parseFloat(getComputedStyle(root).paddingRight), columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        cards:items.map(el=>({height:el.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth,radius:getComputedStyle(el).borderRadius})), overflow:document.documentElement.scrollWidth>innerWidth };
    });
    expect(metrics.columns).toBe(metrics.width>=760?2:1);expect(metrics.overflow).toBe(false);
    for(const c of metrics.cards){expect(c.overflow).toBe(false);expect(c.radius).toBe('24px');}
    if(metrics.columns===2) expect(metrics.cards[0].height).toBe(metrics.cards[1].height);
    await expect(cards.first().locator('.audio-preview-play')).toHaveCSS('width',metrics.width<=400?'52px':'60px');
    await expect(cards.first().locator('.opportunity-art')).toHaveCSS('transform',/matrix/);
    await page.screenshot({path:info.outputPath(`home-${width}.png`),animations:'disabled'});
  }
});
test('missing artwork, long content, extra opportunities and unavailable main media remain usable', async ({page},info)=>{
  await page.route('**/api/opportunities/projects?*',async route=>{
    const response=await route.fetch(),data=await response.json();
    data.items=data.items.slice(0,4).map((item:any,i:number)=>({...item,project:{...item.project,title:`${i+1} A very long project title with enough words to wrap across several lines`,coverUrl:i===1?'/missing-home-art.png':null,status:i%2?'published':'funding',goalAmount:1000,raisedAmount:250},preview:null,previewSelection:true,offers:i<2?Array.from({length:4},(_,n)=>({id:900+n,need:'Recording and additional arrangements',workTitle:'A song with a longer name',compensation:{kind:'split',percent:10}})):[]}));data.nextCursor=null;data.nextPageCursor=null;
    await route.fulfill({response,json:data});
  });
  await page.goto('/explore');const cards=page.locator('.opportunity-home article');
  await expect(cards).toHaveCount(4);for(let i=0;i<4;i++){
    const card=cards.nth(i);await card.locator('..').scrollIntoViewIfNeeded();await expect(card).toBeVisible();
    await expect(card.getByRole('img',{name:'No project artwork',exact:true})).toBeVisible();
    await expect(card).toContainText('Principal recording unavailable.');await expect(card.locator('audio,video')).toHaveCount(0);
    await expect(card.locator('progress')).toHaveCount(i%2?0:1);await expect(card.locator('li')).toHaveCount(i<2?2:0);
    if(i<2)await expect(card).toContainText('+2 opportunities');
    expect(await card.evaluate(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight+1)).toBe(true);
    await expect(card.getByRole('link',{name:'View project',exact:true})).toBeVisible();
  }
  await cards.first().scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`home-edge-${info.project.name}.png`),animations:'disabled'});
});
test('manual play, keyboard seek, save and artist navigation remain independent',async({page})=>{
  await page.goto('/explore');
  const data=await (await page.request.get('/api/opportunities/projects')).json();
  const item=data.items.find((i:any)=>i.preview?.publicationId&&i.preview.media.kind==='audio');expect(item).toBeTruthy();
  const card=page.locator(`article[aria-label="${item.project.title}"]`);await card.locator('..').scrollIntoViewIfNeeded();await expect(card).toBeVisible();
  const button=card.locator('.audio-preview-play'),audio=card.locator('audio');
  await button.focus();await page.keyboard.press('Enter');await expect(audio).toHaveJSProperty('paused',false);
  await button.press('Space');await expect(audio).toHaveJSProperty('paused',true);
  await card.getByRole('slider').fill('10');await expect(audio).toHaveJSProperty('currentTime',10);await expect(page).toHaveURL(/\/explore$/);
  const old=await audio.elementHandle(),save=card.locator('.opportunity-save'),was=await save.getAttribute('aria-pressed');
  await save.focus();await page.keyboard.press('Enter');await expect(save).toHaveAttribute('aria-pressed',was==='true'?'false':'true');expect(await old!.evaluate(e=>e.isConnected)).toBe(true);await expect(audio).toHaveJSProperty('currentTime',10);
  await card.locator('.opportunity-author').click();await expect(page).toHaveURL(new RegExp(`/artist/${item.project.artistId}$`));
});
test('desktop hover starts and leaves the existing audio; manual play survives leaving',async({page},info)=>{
  test.skip(info.project.name==='mobile','Hover is not enabled on touch devices');
  await page.goto('/explore');const card=page.locator('article.opportunity-card').first();await expect(card).toBeVisible();const audio=card.locator('audio');
  // Warm browser audio permission with an explicit interaction before checking optional hover.
  await card.locator('.audio-preview-play').click();await expect(audio).toHaveJSProperty('paused',false);await card.locator('.audio-preview-play').click();await page.getByRole('heading',{name:'Find your next project.'}).hover();
  await card.hover({position:{x:20,y:20}});await expect(audio).toHaveJSProperty('paused',false);await page.getByRole('heading',{name:'Find your next project.'}).hover();await expect(audio).toHaveJSProperty('paused',true);
  await card.locator('.audio-preview-play').click();await page.getByRole('heading',{name:'Find your next project.'}).hover();await expect(audio).toHaveJSProperty('paused',false);await expect(page).toHaveURL(/\/explore$/);
});
test('video keeps its native controls and the investor catalog keeps its layout',async({page})=>{
 const post=await (await page.request.get('/api/publications/11')).json();
 await page.route('**/api/opportunities/projects?*',async route=>{const response=await route.fetch(),data=await response.json();data.items=[{...data.items[0],preview:{title:post.title,media:post.media},previewSelection:true}];data.nextCursor=null;data.nextPageCursor=null;await route.fulfill({response,json:data});});
 await page.goto('/explore');const card=page.locator('article.opportunity-card');await expect(card).toBeVisible();const video=card.locator('video');await expect(video).toHaveAttribute('controls','');await expect(card.locator('audio')).toHaveCount(0);await expect(video).toHaveCSS('z-index','2');
 await page.request.post('/api/presentation/switch',{headers,data:{accountId:7}});await page.reload();await expect(page.locator('.opportunity-home')).toHaveCount(0);await expect(page.getByRole('heading').first()).toBeVisible();
});
test('waveform failure retains a functional timeline without fabricated recording data',async({page})=>{
 await page.route('**/api/publications/*/waveform?*',route=>route.fulfill({status:503,json:{message:'Temporary waveform failure'}}));
 await page.goto('/explore');const card=page.locator('article[aria-label="LUNA · Next phase"]');await expect(card).toBeVisible();await expect(card.locator('.audio-preview-line')).toBeVisible();await expect(card.locator('.audio-preview-wave svg')).toHaveCount(0);
 await card.getByRole('slider').fill('12');await expect(card.locator('audio')).toHaveJSProperty('currentTime',12);await expect(page).toHaveURL(/\/explore$/);await expect(card.getByRole('button',{name:'Reload waveform'})).toBeVisible();
});
