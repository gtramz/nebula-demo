import { test, expect, type Page } from '@playwright/test';
const headers = {Origin:'http://127.0.0.1:4177','X-Nebula-Request':'1'};
async function call(page:Page,path:string,data?:unknown) {
 const response=await page.request.fetch(path,{method:data===undefined?'GET':'POST',headers,data});
 expect(response.ok(),await response.text()).toBe(true);return response.json();
}
const rpc=async(page:Page,method:string,...args:unknown[])=>(await call(page,'/api/rpc',{method,args})).result;
async function review(page:Page,title:string){
 await page.goto('/profile?create=project');await page.getByLabel('TITLE',{exact:true}).fill(title);
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();
}
test.beforeEach(async({page})=>{await call(page,'/api/presentation/reset',{confirm:true});});
test('optional funding keeps unfunded releases clean and stores editable allocations',async({page},info)=>{
 await review(page,'No funding release');
 const toggle=page.getByRole('switch',{name:'Enable funding',exact:true});
 await expect(toggle).not.toBeChecked();await expect(page.getByLabel('Goal (USD)',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('STATUS',{exact:true}).locator('option[value=funding]')).toHaveCount(0);
 await page.getByLabel('STATUS',{exact:true}).selectOption('published');await page.getByRole('button',{name:'Publish project',exact:true}).click();
 await expect(page).toHaveURL(/\/profile$/);
 const unfunded=(await rpc(page,'listProjects')).find((p:any)=>p.title==='No funding release');
 expect(unfunded).toMatchObject({goalAmount:0,useOfFunds:[],status:'published'});
 await page.goto(`/project/${unfunded.id}`);await expect(page.getByRole('heading',{name:unfunded.title,exact:true})).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Project funding'})).toHaveCount(0);
 await page.reload();await expect(page.getByRole('heading',{name:unfunded.title,exact:true})).toBeVisible();
 await review(page,'Funding allocation release');await toggle.check();
 await page.getByLabel('Goal (USD)',{exact:true}).fill('8000');
 await page.getByLabel('Fund purpose 1',{exact:true}).fill('Recording');await page.getByLabel('Fund percentage 1',{exact:true}).fill('60');
 await page.getByRole('button',{name:'Add purpose',exact:true}).click();
 await page.getByLabel('Fund purpose 2',{exact:true}).fill('Mix & master');await page.getByLabel('Fund percentage 2',{exact:true}).fill('30');
 await page.getByLabel('STATUS',{exact:true}).selectOption('funding');await page.getByRole('button',{name:'Publish project',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('100%');
 await page.getByLabel('Fund percentage 2',{exact:true}).fill('40');
 await page.getByRole('button',{name:'Step 1: Identity',exact:true}).click();await page.getByRole('button',{name:'Step 4: Review',exact:true}).click();
 await expect(page.getByLabel('Goal (USD)',{exact:true})).toHaveValue('8000');
 await toggle.uncheck();await expect(page.getByLabel('STATUS',{exact:true})).toHaveValue('published');await toggle.check();
 await expect(page.getByLabel('Fund percentage 2',{exact:true})).toHaveValue('40');
 await page.getByLabel('STATUS',{exact:true}).selectOption('funding');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('funding-review.png'),fullPage:true});
 await page.getByRole('button',{name:'Publish project',exact:true}).click();await expect(page).toHaveURL(/\/profile$/);
 const funded=(await rpc(page,'listProjects')).find((p:any)=>p.title==='Funding allocation release');
 expect(funded).toMatchObject({goalAmount:8000,status:'funding',useOfFunds:[{label:'Recording',percentage:60},{label:'Mix & master',percentage:40}]});
 await page.getByRole('button',{name:`edit ${funded.title}`,exact:true}).click();
 await expect(toggle).toBeChecked();await expect(page.getByLabel('Fund purpose 2',{exact:true})).toHaveValue('Mix & master');
 await page.getByLabel('PITCH (Short description)',{exact:true}).fill('Updated description');await page.getByRole('button',{name:'SAVE PROJECT',exact:true}).click();
 await expect(page.getByRole('button',{name:`edit ${funded.title}`,exact:true})).toBeVisible();
 expect((await rpc(page,'getProject',funded.id)).project.useOfFunds).toEqual(funded.useOfFunds);
 await page.goto(`/project/${funded.id}`);const funding=page.getByRole('complementary',{name:'Project funding'});await expect(funding).toContainText('Recording');await expect(funding).toContainText('60%');
 await page.screenshot({path:info.outputPath('funding-project.png'),fullPage:true});
});
test('CHILZ receives two contributions with private history and investor isolation',async({page,browser},info)=>{
 const history=await rpc(page,'listReceivedInvestments');const contributions=history.filter((i:any)=>i.projectTitle==='CHILZ · Next chapter');
 expect(contributions).toHaveLength(2);expect(contributions.reduce((sum:number,i:any)=>sum+i.amount,0)).toBe(2000);
 await page.goto('/profile');await page.getByRole('link',{name:/Contributions received/}).click();await expect(page).toHaveURL(/\/received$/);
 const card=page.getByRole('article',{name:'CHILZ · Next chapter history'});await expect(card).toContainText('2,000.00');await card.getByText('View 2 contributions',{exact:true}).click();
 await expect(card).toContainText('Elena Costa');await expect(card).toContainText('Noah Bennett');await page.screenshot({path:info.outputPath('chilz-received.png'),fullPage:true});
 await page.reload();await expect(card).toContainText('2 contributions');
 const guest=await browser.newContext({baseURL:'http://127.0.0.1:4177'});
 try{
   const response=await guest.request.post('/api/rpc',{headers,data:{method:'listReceivedInvestments',args:[]}});expect(response.status()).toBe(401);
   const details=await rpc(page,'getProject',contributions[0].projectId);expect(details.project).toMatchObject({raisedAmount:2000,backersCount:2,goalAmount:5000});
   const status=await call(page,'/api/presentation');const investor=status.accounts.find((a:any)=>a.name==='Elena Costa');
   await call(page,'/api/presentation/switch',{accountId:investor.id});
   expect((await rpc(page,'listMyInvestments')).filter((i:any)=>i.projectId===contributions[0].projectId)).toHaveLength(1);
   const denied=await page.request.post('/api/rpc',{headers,data:{method:'listReceivedInvestments',args:[]}});expect(denied.ok()).toBe(false);
 }finally{await guest.close();}
});

test('editing an existing legacy goal does not invent or require an allocation for unrelated changes',async({page})=>{
 const legacy=await rpc(page,'createProject',{title:'Legacy funding setup',category:'EP',status:'published',goalAmount:4000,useOfFunds:[]});
 await page.goto('/profile');await page.getByRole('button',{name:`edit ${legacy.title}`,exact:true}).click();
 await page.getByLabel('PITCH (Short description)',{exact:true}).fill('Updated pitch only');await page.getByRole('button',{name:'SAVE PROJECT',exact:true}).click();
 await expect(page.getByRole('button',{name:`edit ${legacy.title}`,exact:true})).toBeVisible();
 expect((await rpc(page,'getProject',legacy.id)).project).toMatchObject({goalAmount:4000,useOfFunds:[],status:'published',pitch:'Updated pitch only'});
});
