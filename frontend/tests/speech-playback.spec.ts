import {test,expect} from '@playwright/test';
function wav(seconds=.08) {
  const length=Math.round(24000*seconds); const bytes=Buffer.alloc(44+length*2);
  bytes.write('RIFF'); bytes.writeUInt32LE(36+length*2,4); bytes.write('WAVE',8); bytes.write('fmt ',12); bytes.writeUInt32LE(16,16); bytes.writeUInt16LE(1,20); bytes.writeUInt16LE(1,22); bytes.writeUInt32LE(24000,24); bytes.writeUInt32LE(48000,28); bytes.writeUInt16LE(2,32); bytes.writeUInt16LE(16,34); bytes.write('data',36); bytes.writeUInt32LE(length*2,40);
  return bytes;
}
test('specific review playback is sequential, uses exact text, and supports stop',async({page})=>{
  const texts:string[]=[]; const counts={active:0,max:0};
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'mock-nonce',message:'Test voice'}}));
  await page.route('**/api/speech/review',async route=>{counts.active++;counts.max=Math.max(counts.max,counts.active);texts.push(route.request().postDataJSON().text);await route.fulfill({contentType:'audio/wav',body:wav()});counts.active--;});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read long review'}).click();
  await expect(page.getByRole('status')).toHaveText('completed');
  expect(texts.length).toBeGreaterThan(1); expect(texts.every(text=>text.length<=1800)).toBe(true);expect(texts.join(' ')).toContain('Observation 15'); expect(counts.max).toBe(1);
  await page.route('**/api/speech/review',route=>route.fulfill({contentType:'audio/wav',body:wav(8)}));
  await page.getByRole('button',{name:'Read review',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('speaking');
  await page.getByRole('button',{name:'Stop',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('cancelled');
  await page.getByRole('button',{name:'Read review',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('speaking');
  await page.getByRole('button',{name:'Cancel this reading',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('cancelled');
  await page.getByRole('button',{name:'Read long review'}).click(); await expect(page.getByRole('status')).toHaveText('speaking');
  await page.getByRole('button',{name:'Mute',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('cancelled');
});
test('unavailable and muted speech are explicit and never use generic fallback',async({page})=>{
  let generated=0;
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:false,provider:'deepgram',model:null,maxCharacters:1800,message:'Live voice is not connected.'}}));
  await page.route('**/api/speech/review',route=>{generated++;return route.abort();});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click(); await expect(page.getByRole('status')).toHaveText('unavailable: Live voice is not connected.');
  await page.getByRole('button',{name:'Mute',exact:true}).click(); await page.getByRole('button',{name:'Read review',exact:true}).click(); await expect(page.getByRole('status')).toContainText('muted:'); expect(generated).toBe(0);
});

test('guest voice explains sign-in without sending text to Deepgram',async({page})=>{
  let generated=0;
  await page.route('**/api/speech/config',route=>route.fulfill({status:401,json:{message:'Sign in to restore your journey.'}}));
  await page.route('**/api/speech/review',route=>{generated++;return route.abort();});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Sign in for ORBIT’s spoken feedback.');
  expect(generated).toBe(0);
});

test('a session ending between configuration and generation asks for sign-in',async({page})=>{
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'cookie-session',message:'Test voice'}}));
  await page.route('**/api/speech/review',route=>route.fulfill({status:401,json:{message:'Your session has ended.'}}));
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Sign in for ORBIT’s spoken feedback.');
});

test('configuration errors preserve the server explanation instead of a generic network failure',async({page})=>{
  await page.route('**/api/speech/config',route=>route.fulfill({status:503,json:{message:'Live voice is not connected yet.'}}));
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('unavailable: Live voice is not connected yet.');
});

test('stopping a pending generation prevents late audio from playing',async({page})=>{
  await page.addInitScript(()=>{
    const create=AudioContext.prototype.createBufferSource;
    Object.assign(window,{speechStarts:0});
    AudioContext.prototype.createBufferSource=function(){const source=create.call(this),start=source.start.bind(source);source.start=(...args:Parameters<typeof start>)=>{const state=window as unknown as {speechStarts:number};state.speechStarts++;start(...args);};return source;};
  });
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'mock-nonce',message:'Test voice'}}));
  await page.route('**/api/speech/review',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.fulfill({contentType:'audio/wav',body:wav()}).catch(()=>{});});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();await expect(page.getByRole('status')).toHaveText('preparing');
  await page.getByRole('button',{name:'Stop',exact:true}).click();await expect(page.getByRole('status')).toHaveText('cancelled');
  await page.waitForTimeout(900); expect(await page.evaluate(()=>(window as unknown as {speechStarts:number}).speechStarts)).toBe(0);
});

test('external cancellation settles even while browser audio resume is suspended',async({page})=>{
  await page.addInitScript(()=>{AudioContext.prototype.resume=()=>new Promise<void>(()=>{});});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();await expect(page.getByRole('status')).toHaveText('preparing');
  await page.getByRole('button',{name:'Cancel this reading',exact:true}).click();await expect(page.getByRole('status')).toHaveText('cancelled');
});

test('blocked browser audio offers a retry instead of waiting forever or spending quota',async({page})=>{
  let generated=0;
  await page.addInitScript(()=>{AudioContext.prototype.resume=()=>new Promise<void>(()=>{});});
  await page.route('**/api/speech/review',route=>{generated++;return route.abort();});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('error: Your browser paused audio. Choose Try voice again');
  expect(generated).toBe(0);
});

test('a stalled opening asset cannot block report speech',async({page})=>{
  await page.route('**/audio/opening.wav*',()=>{});
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'mock-nonce',message:'Test voice'}}));
  await page.route('**/api/speech/review',route=>route.fulfill({contentType:'audio/wav',body:wav()}));
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('completed',{timeout:4000});
});

test('an unresponsive voice configuration settles and a new click can retry',async({page})=>{
  await page.route('**/api/speech/config',()=>{});
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('unavailable: The voice connection did not respond.',{timeout:8000});
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'mock-nonce',message:'Test voice'}}));
  await page.route('**/api/speech/review',route=>route.fulfill({contentType:'audio/wav',body:wav()}));
  await page.getByRole('button',{name:'Read review',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('completed');
});

test('device suspension during playback settles and Listen resumes audio',async({page})=>{
  await page.addInitScript(()=>{
    const Native=AudioContext;
    Object.defineProperty(window,'AudioContext',{value:class extends Native {constructor(){super();Object.assign(window,{testAudioContext:this});}}});
  });
  await page.route('**/api/speech/config',route=>route.fulfill({json:{available:true,provider:'deepgram',model:'mock',maxCharacters:1800,token:'mock-nonce',message:'Test voice'}}));
  await page.route('**/api/speech/review',route=>route.fulfill({contentType:'audio/wav',body:wav(8)}));
  await page.goto('/tests/harnesses/speech.html');
  await page.getByRole('button',{name:'Read review',exact:true}).click();await expect(page.getByRole('status')).toHaveText('speaking');
  await page.evaluate(()=> (window as unknown as {testAudioContext:AudioContext}).testAudioContext.suspend());
  await expect(page.getByRole('status')).toContainText('error: Audio playback was interrupted.');
  await page.route('**/api/speech/review',route=>route.fulfill({contentType:'audio/wav',body:wav()}));
  await page.getByRole('button',{name:'Read review',exact:true}).click();await expect(page.getByRole('status')).toHaveText('completed');
});
