import {test,expect} from '@playwright/test';
import {existsSync,readFileSync,mkdirSync} from 'node:fs';

// Opt-in private reproduction. Real video decoding/pose inference, local-only
// routes and harness speech. No private fixture, screenshot or trace in Git.
const enabled=process.env.ASTER_PRIVATE_CROPPED==='1';
const manifest='artifacts/cropped-evaluation/private-inputs.json';
const fixtures:{id:string;exercise:string;path:string;privacy:string}[]=enabled&&existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8')):[];
for(const fixture of fixtures.filter(input=>['private-pushup','private-pullup'].includes(input.id)))test(`actual cropped recording through coaching UI: ${fixture.id}`,async({page,context})=>{
 test.setTimeout(300000);expect(fixture.privacy).toBe('private');
 const external:string[]=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://127.0.0.1:5174'||url.pathname.startsWith('/api/')){external.push(url.origin+url.pathname);await route.abort();return;}
  await route.continue();
 });
 await page.goto(`/tests/harnesses/review.html?exercise=${fixture.exercise}&voice=test`);
 await page.getByLabel('Choose exercise video').setInputFiles(fixture.path);
 await page.getByRole('button',{name:/Analyze movement/}).click();
 await expect(page.getByRole('region',{name:'Movement analysis results'})).toBeVisible({timeout:120000});
 if(fixture.exercise==='pullup'){
  await expect(page.locator('.coach-focus')).toContainText('ONE PART I COULD FOLLOW');
  await expect(page.locator('.coach-focus')).toContainText('hips and shoulders coming down together');
  const moment=page.getByRole('button',{name:/Coming down together/});await expect(moment).toBeVisible();
  await moment.click();
  await expect.poll(()=>page.locator('video').evaluate(video=>video.paused&&video.currentTime>16.3),{timeout:10000}).toBe(true);
  const time=await page.locator('video').evaluate(video=>video.currentTime);expect(time).toBeGreaterThan(14);expect(time).toBeLessThan(18);
 }else{
  await expect(page.locator('.coach-focus')).toContainText('A PRACTICE CUE, NOT A DETECTED FAULT');
  await expect(page.locator('.review-moment')).toHaveCount(0);
  await page.getByText('Change the version or goal for this review',{exact:true}).click();
  await page.getByLabel('Exercise variation').selectOption('assisted');
  await expect(page.locator('.coach-focus')).toContainText('kneeling or raised-hand');
 }
 await expect.poll(()=>page.evaluate(()=>(window as any).reviewSpeechCalls.at(-1)),{timeout:15000}).toContain(fixture.exercise==='pullup'?'hips and shoulders coming down together':'kneeling or raised-hand');
 await page.getByRole('button',{name:'What couldn’t you see?'}).click();
 await expect(page.locator('.coach-reply')).toBeVisible();
 await page.getByLabel('I’ve listened to or read my feedback.').check();
 mkdirSync('artifacts/private-evaluation/return-ui',{recursive:true});
 await page.screenshot({path:`artifacts/private-evaluation/return-ui/${fixture.id}.png`});
 await page.getByRole('button',{name:/review & return/}).click();
 const saved=await page.evaluate(()=>(window as any).savedReviews[0]);
 expect(saved.analysisVersion).toBe('partial-review-0.11');expect(saved.knowledgeVersion).toBe('1.2.0');
 expect(saved.findings[0].id).toBe(fixture.exercise==='pullup'?'pullup-return-together':'practice-pushup');
 expect(saved.status).toBe(fixture.exercise==='pullup'?'usable':'partial');
 expect(external).toEqual([]);
});

test('private coaching UI reproduction requires an explicit opt-in and local manifest',()=>{
 test.skip(!enabled);expect(fixtures.length).toBeGreaterThanOrEqual(2);
});
