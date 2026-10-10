import {test,expect} from '@playwright/test';
import {park,moveTo} from './helpers/voice-expedition';

test('guest sign-in keeps the uploaded clip and review, then automatically plays feedback',async({page})=>{
 test.setTimeout(180000);
 const journey={entries:[],activity:[],protected:[],regular:0,reserve:0,week:'2026-10-05'};
 const profile={id:'00000000-0000-4000-8000-000000000001',authorizedId:'visitor_test',callsign:'Mira',timezone:'Asia/Singapore',onboardingComplete:true};
 let signedIn=false,readings=0;
 await page.route('**/api/outpost?*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='session')await route.fulfill({json:{configured:true,authenticated:false,emailAvailable:false}});
  else if(action==='login'){
   if(route.request().postDataJSON().password==='wrong-password')await route.fulfill({status:401,json:{message:'The authorized ID or password did not match.'}});
   else {signedIn=true;await route.fulfill({json:{profile,journey}});}
  }else if(action==='journey')await route.fulfill({json:journey});
  else await route.fulfill({json:{available:false,message:'Test context disabled'}});
 });
 await page.route('**/api/speech/config',route=>route.fulfill(signedIn?{json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'cookie-session',message:'Test voice'}}:{status:401,json:{message:'Sign in to restore your journey.'}}));
 await page.route('**/api/speech/review',route=>{
  readings++;
  const samples=2400,audio=Buffer.alloc(44+samples*2);audio.write('RIFF');audio.writeUInt32LE(36+samples*2,4);audio.write('WAVE',8);audio.write('fmt ',12);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(24000,24);audio.writeUInt32LE(48000,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(samples*2,40);
  return route.fulfill({contentType:'audio/wav',body:audio});
 });
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await park(page);await page.getByRole('button',{name:/02.*GROUNDWORK.*Push-ups/}).click();await moveTo(page,0,70);await page.keyboard.press('e');
 await page.getByLabel('Choose exercise video').setInputFiles('tests/fixtures/playback.mp4');
 const video=page.getByLabel('Push-ups recording preview',{exact:true});const url=await video.getAttribute('src');
 await page.getByRole('button',{name:'Sign in for spoken feedback',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Welcome back.',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close panel',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Push-ups',exact:true})).toBeVisible();expect(await video.getAttribute('src')).toBe(url);
 await page.getByRole('button',{name:/Analyze movement/}).click();
 const voice=page.getByRole('region',{name:'Spoken feedback'});
 await expect(voice).toContainText('Sign in for ORBIT’s spoken feedback.');expect(readings).toBe(0);
 const title=await page.locator('.analysis-results h3').innerText();
 await voice.getByRole('button',{name:'Sign in & hear my feedback'}).click();
 await page.getByLabel('Authorized ID',{exact:true}).fill('visitor_test');await page.getByLabel('Authorization password',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Sign in to the outpost'}).click();
 await expect(page.getByRole('alert')).toContainText('did not match');
 await page.getByLabel('Authorization password',{exact:true}).fill('test-only-password-123');await page.getByRole('button',{name:'Sign in to the outpost'}).click();
 await expect(page.getByRole('heading',{name:'Push-ups',exact:true})).toBeVisible();
 await expect(voice).toHaveAttribute('data-voice-state','ready');expect(readings).toBe(1);
 expect(await video.getAttribute('src')).toBe(url);await expect(page.locator('.analysis-results h3')).toHaveText(title);
 await expect(page.getByRole('button',{name:/Listen again/})).toBeVisible();expect(errors).toEqual([]);
});
