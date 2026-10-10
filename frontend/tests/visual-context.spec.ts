import {test,expect,type Page} from '@playwright/test';
const report={id:'5e1679af-7858-494f-9f73-c6c96bc32747',exercise:'pushup',status:'partial',duration:2,width:640,height:480,frames:[],sampledFrames:8,usableFrames:3,coverage:.375,findings:[],summary:'Test fixture',limitations:[],sources:[],estimatedRepetitions:0,poseFrames:3,captureNotes:[]};
async function start(page:Page){
 await page.route('**/src/analysis/analyzeVideo.ts*',route=>route.fulfill({contentType:'text/javascript',body:`export async function analyzeVideo(){return ${JSON.stringify(report)}}`}));
 await page.route('**/api/outpost?action=vision-config',route=>route.fulfill({json:{available:true,model:'google/gemma-3-27b-it'}}));
 await page.route('**/api/outpost?action=coach-config',route=>route.fulfill({json:{available:false}}));
 await page.goto('/tests/harnesses/review.html?exercise=pushup&voice=test&account');
 await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
 await page.getByRole('button',{name:/Analyze movement/}).click();
 await expect(page.getByRole('region',{name:'Movement analysis results'})).toBeVisible();
 await page.getByText('Optional: let ORBIT check the visible context',{exact:true}).click();
}
test('snapshot preview is local, sharing is explicit, and visual context cannot create a correction',async({page})=>{
 const sent:any[]=[];
 await page.route('**/api/outpost?action=vision-context',route=>{sent.push(route.request().postDataJSON());return route.fulfill({json:{mode:'visual-context',context:{exerciseObserved:'squat',view:'angled',visibleRegions:['elbows','hands'],frameIndices:[0,1]}}});});
 await start(page);expect(sent).toHaveLength(0);
 await page.getByRole('button',{name:'Preview the snapshots first'}).click();
 await expect(page.locator('.context-snapshots img')).toHaveCount(6);
 await expect(page.getByRole('button',{name:'Check these snapshots'})).toBeDisabled();expect(sent).toHaveLength(0);
 await page.getByRole('checkbox',{name:/Send these six snapshots/}).check();
 await page.getByRole('button',{name:'Check these snapshots'}).click();
 await expect(page.locator('.visual-context-review [role=status]')).toContainText('recognized squats');expect(sent).toHaveLength(1);
 expect(Object.keys(sent[0]).sort()).toEqual(['consent','discomfort','exercise','frames','goal','variant']);
 expect(sent[0].frames).toHaveLength(6);expect(sent[0].frames.every((f:any)=>f.dataUrl.startsWith('data:image/jpeg;base64,'))).toBe(true);
 expect(sent[0].frames.every((f:any)=>Object.keys(f).sort().join(',')==='dataUrl,timestamp')).toBe(true);
 await expect(page.getByRole('heading',{name:'Let’s use the part I can see'})).toBeVisible();
 await expect(page.locator('.review-uncertainty')).toContainText('chosen station disagree');
 await expect(page.locator('.review-moment')).toHaveCount(0);
 await page.screenshot({path:'artifacts/visual-context-preview.png'});
});
test('injury disclosure removes optional image sharing before a request can be made',async({page})=>{
 let sent=0;await page.route('**/api/outpost?action=vision-context',route=>{sent++;return route.fulfill({json:{mode:'local',reason:'health-context'}});});
 await start(page);await page.getByRole('button',{name:'Preview the snapshots first'}).click();
 await expect(page.locator('.context-snapshots img')).toHaveCount(6);
 await page.getByRole('button',{name:'That felt painful'}).click();
 await expect(page.locator('.visual-context-review')).toHaveCount(0);expect(sent).toBe(0);
});
test('cancelling a slow provider response leaves the local review and ignores late context',async({page})=>{
 let release:()=>void=()=>{};
 await page.route('**/api/outpost?action=vision-context',async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({json:{mode:'visual-context',context:{exerciseObserved:'squat',view:'front',visibleRegions:[],frameIndices:[0,1]}}}).catch(()=>{});});
 await start(page);await page.getByRole('button',{name:'Preview the snapshots first'}).click();
 await page.getByRole('checkbox',{name:/Send these six snapshots/}).check();await page.getByRole('button',{name:'Check these snapshots'}).click();
 await page.getByRole('button',{name:'Stop visual check'}).click();release();
 await expect(page.locator('.visual-context-review [role=status]')).toContainText('Stopped');
 await expect(page.locator('.review-uncertainty')).not.toContainText('chosen station disagree');
 await expect(page.getByRole('button',{name:'Check these snapshots'})).toBeEnabled();
});
