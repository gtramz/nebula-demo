import {test,expect,type Page} from '@playwright/test';
const headers={Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function rpc(page:Page,method:string,...args:unknown[]){const r=await page.request.post('/api/rpc',{headers,data:{method,args}});expect(r.ok(),await r.text()).toBe(true);return (await r.json()).result;}
test('received project cards preserve filtering, history, responsive state and archived records',async({page},info)=>{
 await page.request.post('/api/presentation/reset',{headers,data:{confirm:true}});
 const entries=await rpc(page,'listReceivedInvestments');const entry=entries.find((e:any)=>e.projectTitle==='CHILZ · Next chapter');
 await page.goto('/received');const card=page.getByRole('article',{name:'CHILZ · Next chapter history'});
 await expect(card.getByRole('img')).toBeVisible();await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow','40');
 await expect(card).toContainText('USD 2,000.00');await card.getByText('View 2 contributions',{exact:true}).click();
 await expect(card).toContainText('Elena Costa');await expect(card).toContainText('Noah Bennett');
 await page.getByRole('heading',{name:'Contributions received',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('contributions.png')});
 await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('combobox',{name:'Project',exact:true}).selectOption(String(entry.projectId));
 await page.getByLabel('To date',{exact:true}).fill('2000-01-01');await expect(page.getByText('No contributions match these filters.')).toBeVisible();
 await page.setViewportSize({width:768,height:900});await expect(page.getByLabel('To date',{exact:true})).toHaveValue('2000-01-01');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(card).toBeVisible();
 await page.getByLabel('From date',{exact:true}).fill('2030-01-02');await page.getByLabel('To date',{exact:true}).fill('2030-01-01');await expect(page.getByRole('alert')).toContainText('end date');
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await card.getByRole('link',{name:'View project: CHILZ · Next chapter'}).click();await expect(page).toHaveURL(new RegExp(`/project/${entry.projectId}$`));
 await rpc(page,'deleteProject',entry.projectId);await page.goto('/received');await expect(card).toContainText('Removed project');await expect(card).toContainText('USD 2,000.00');await expect(card.getByRole('link')).toHaveCount(0);
 await card.getByText('View 2 contributions',{exact:true}).click();await expect(card).toContainText('Elena Costa');
 expect((await rpc(page,'listReceivedInvestments')).map((e:any)=>({id:e.id,amount:e.amount}))).toEqual(entries.map((e:any)=>({id:e.id,amount:e.amount})));
});
