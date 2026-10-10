import {test,expect,type Page} from '@playwright/test';
import type {AnalysisReport} from '../src/analysis/types';

// This exercises UI orchestration with independent synthetic tracking data.
// live-review.spec.ts separately exercises the real model and recording.
function syntheticReport():AnalysisReport {
 const frames=Array.from({length:33},(_,i)=>{
  const phase=Math.sin(i*.25*Math.PI/2),landmarks=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
  for(const [id,x,y] of [[11,.2,.38+.06*phase],[13,.24,.51],[15,.2,.7],[23,.5,.5-.065*phase],[25,.65,.57],[27,.8,.62]])landmarks[id]={x,y,z:0,visibility:1};
  return {timestamp:i*.25,landmarks,metrics:{elbow:100,knee:null,hip:170,bodyTilt:70,side:'left' as const,orientationMatches:true,orientation:'compatible' as const}};
 });
 return {id:'5e1679af-7858-494f-9f73-c6c96bc32747',exercise:'pushup',status:'usable',duration:8,width:640,height:640,frames,sampledFrames:33,usableFrames:33,coverage:1,findings:[],summary:'Synthetic test',limitations:[],sources:[],estimatedRepetitions:1,poseFrames:33,captureNotes:[]};
}
async function start(page:Page,account=false) {
 await page.route('**/src/analysis/analyzeVideo.ts*',route=>route.fulfill({contentType:'text/javascript',body:`export async function analyzeVideo(){return ${JSON.stringify(syntheticReport())};}`}));
 await page.goto('/tests/harnesses/review.html?exercise=pushup&voice=test'+(account?'&account':''));
 await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
 await page.getByRole('button',{name:/Analyze movement/}).click();
 await expect(page.getByRole('region',{name:'Movement analysis results'})).toBeVisible();
}
test('review gives a practical spoken cue, lets you ask why, and saves actionable notes',async({page})=>{
 await start(page);
 await expect(page.locator('.coach-focus')).toContainText('hips and shoulders moving together');
 await expect.poll(()=>page.evaluate(()=>(window as any).reviewSpeechCalls.length)).toBe(1);
 await page.getByRole('button',{name:'Why does that help?'}).click();
 await expect(page.locator('.coach-reply')).toContainText('steady');
 await expect.poll(()=>page.evaluate(()=>(window as any).reviewSpeechCalls.length)).toBe(2);
 await page.getByRole('button',{name:'View written feedback'}).click();
 await expect(page.locator('#written-feedback')).toContainText('Why:');
 await expect(page.getByRole('link',{name:/Push-up guidance/})).toBeHidden();
 await page.getByText('Measurements, limits and sources',{exact:true}).click();
 await expect(page.getByRole('link',{name:/Push-up guidance/})).toHaveAttribute('href',/acefitness/);
 await page.getByLabel('I’ve listened to or read my feedback.').check();
 await page.getByRole('button',{name:/Finish review & return/}).click();
 const saved=await page.evaluate(()=>(window as any).savedReviews[0]);
 expect(saved.findings[0].id).toBe('pushup-timing');expect(saved.findings[0].suggestion).toContain('steady');
 expect(saved.findings[0].suggestion).not.toMatch(/°|projected/);
});
test('a pain disclosure changes the review and voice instead of continuing a form prescription',async({page})=>{
 await start(page);
 await page.getByRole('button',{name:'That felt painful'}).click();
 await expect(page.locator('.coach-focus')).toContainText('stop the set');
 await expect(page.locator('.coach-reply')).toContainText('stop the set');
 await expect(page.locator('.review-moment')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).reviewSpeechCalls.at(-1))).toContain('put comfort first');
 await page.screenshot({path:'artifacts/coaching-comfort-review.png'});
});
test('optional conversation sends only an opted-in question and trusted cue identifier',async({page})=>{
 const sent:Record<string,unknown>[]=[];
 await page.route('**/api/outpost?action=coach-config',route=>route.fulfill({json:{available:true,model:'Test only'}}));
 await page.route('**/api/outpost?action=coach-question',route=>{sent.push(route.request().postDataJSON());return route.fulfill({json:{message:'Moving together helps you keep this movement steady.',mode:'provider-selected'}});});
 await start(page,true);
 await page.getByRole('button',{name:'Why does that help?'}).click();expect(sent).toHaveLength(0);
 await page.getByRole('checkbox',{name:/Use Nebius/}).check();
 await page.getByRole('button',{name:'How do I try it?'}).click();
 await expect(page.locator('.coach-reply')).toContainText('Moving together helps');expect(sent).toHaveLength(1);
 expect(Object.keys(sent[0]).sort()).toEqual(['consent','cueId','exercise','goal','question']);
 await page.getByLabel('Ask ORBIT about this review').fill('My shoulder keeps slipping out');
 await page.getByRole('button',{name:'Ask ORBIT',exact:true}).click();
 await expect(page.locator('.coach-focus')).toContainText('physiotherapist');expect(sent).toHaveLength(1);
 await expect(page.getByRole('checkbox',{name:/Use Nebius/})).toHaveCount(0);
});
