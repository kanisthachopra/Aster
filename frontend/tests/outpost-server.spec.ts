import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createOutpostHandler, cleanReport } from '../server/outpost';

type Row = Record<string, any>;
const servers: Server[] = [];
test.afterEach(async () => { for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } });
function provider() {
  const profiles: Row[] = [], users: Row[] = [], recovery: Row[] = [], codes: Row[] = [], intents: Row[] = [], sessions: Row[] = [];
  const tokens = new Map<string, string>(), requests: Array<{ path: string; method: string; body: Row; headers: Headers }> = [];
  const journey = { entries: [] as Row[], activity: [], protected: [], regular: 0, reserve: 0, week: '2026-10-05' };
  let denyRate = false, denyRateLimit = 0, emailText = '', deletePaths: string[] = [], failOnce = '';
  const mock: typeof fetch = async (input, init) => {
    const url = new URL(String(input)), path = url.pathname, method = init?.method || 'GET', body = JSON.parse(String(init?.body || '{}')), headers = new Headers(init?.headers);
    requests.push({ path, method, body, headers });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (path === failOnce) { failOnce='';return json({message:'private upstream error'},503); }
    const matches = (item: Row) => [...url.searchParams].filter(([key]) => !['select','on_conflict'].includes(key)).every(([key,value]) => String(item[key]) === value.replace(/^eq\./,''));
    if (url.hostname === 'api.resend.com') { emailText = body.text; return json({ id: 'test-email' }); }
    if (url.hostname === 'api.deepgram.com') return new Response(new Uint8Array([73,68,51,4]),{headers:{'content-type':'audio/mpeg'}});
    if (url.hostname === 'api.tokenfactory.nebius.com' && path === '/v1/chat/completions') { const card=JSON.parse(body.messages[1].content).card; return json({choices:[{message:{content:JSON.stringify({cueId:card.id,intro:'why',parts:['why','cue']})}}]}); }
    if (path.endsWith('/consume_rate_limit')) {const denied=denyRate||body.p_limit===denyRateLimit;return json({ allowed: !denied, retry_after: denied ? 60 : 0 });}
    if (path === '/auth/v1/admin/users' && method === 'POST') { const user = { id: randomUUID(), email: body.email, password: body.password }; users.push(user); return json(user); }
    if (path.startsWith('/auth/v1/admin/users/')) { const user = users.find(row => row.id === path.split('/').at(-1)); if (method === 'PUT') Object.assign(user!, body); if(method==='DELETE'&&user){users.splice(users.indexOf(user),1);for(const table of [profiles,recovery,sessions])for(const row of [...table])if(row.id===user.id||row.owner_id===user.id)table.splice(table.indexOf(row),1);}return json(user); }
    if (path === '/auth/v1/token') {
      const user = url.searchParams.get('grant_type') === 'refresh_token' ? users.find(row => row.id === tokens.get(body.refresh_token)) : users.find(row => row.email === body.email && row.password === body.password);
      if (!user) return json({ message: 'private-auth-rejection' }, 400);
      const token = `access-${randomUUID()}`, refresh = `refresh-${randomUUID()}`; tokens.set(token, user.id); tokens.set(refresh, user.id);
      return json({ access_token: token, refresh_token: refresh, expires_in: 3600, user });
    }
    if (path === '/auth/v1/user') { const id = tokens.get(headers.get('authorization')?.slice(7) || ''); return id ? json(users.find(row => row.id === id)) : json({}, 401); }
    if (path === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (path === '/rest/v1/profiles') { if (method === 'POST') profiles.push({ ...body, recovery_email_verified_at: null }); if (method === 'PATCH') profiles.filter(matches).forEach(row => Object.assign(row,body)); return json(profiles.filter(matches)); }
    if (path === '/rest/v1/app_sessions') {if(method==='POST')sessions.push(body);const found=sessions.filter(matches);if(method==='DELETE')for(const row of found)sessions.splice(sessions.indexOf(row),1);return json(found);}
    if (path === '/rest/v1/recovery_credentials') { if (method === 'POST') recovery.push({ ...body, version: 1 }); return json(recovery.filter(matches)); }
    if (path.endsWith('/rotate_recovery')) { const row = recovery.find(item => item.owner_id === body.p_owner_id && item.version === body.p_expected_version && item.secret_hash === body.p_expected_hash); if (row) Object.assign(row, { version: row.version + 1, salt: body.p_new_salt, secret_hash: body.p_new_hash }); return json(Boolean(row)); }
    if (path === '/rest/v1/recovery_email_codes') { if (method === 'POST') { const i=codes.findIndex(row=>row.owner_id===body.owner_id&&row.purpose===body.purpose);if(i>=0) codes.splice(i,1);codes.push(body); } const found=codes.filter(matches);if(method==='DELETE')for(const row of found)codes.splice(codes.indexOf(row),1);return json(found); }
    if (path.endsWith('/get_journey')) return json(journey);
    if (path.endsWith('/complete_review')) { journey.entries.push({ id: body.p_report.id, report: body.p_report, media_path: body.p_media_path }); return json(journey); }
    if (path.endsWith('/delete_review')) { const entry=journey.entries.find(row=>row.id===body.p_review_id);const path=entry?.media_path||null;if(entry) entry.media_path=null;return json(path); }
    if (path === '/rest/v1/media_uploads') { if(method==='POST')intents.push(body);if(method==='PATCH')intents.filter(matches).forEach(row=>Object.assign(row,body));return json(intents.filter(matches)); }
    if (path === '/rest/v1/media_deletion_queue') return json([]);
    if (path.includes('/object/upload/sign/')) return json({ url: `/object/upload/sign/aster-recordings/${path.split('/aster-recordings/')[1]}?token=signed-upload-token` });
    if (path.includes('/object/info/')) { const intent=intents.find(row=>path.endsWith(row.path));return json({metadata:{size:intent?.expected_bytes,mimetype:intent?.mimetype}}); }
    if (path.includes('/object/sign/')) return json({ signedURL: '/object/sign/aster-recordings/private?token=playback-token' });
    if (path === '/storage/v1/object/aster-recordings' && method==='DELETE') { deletePaths=body.prefixes;return json([]); }
    throw new Error(`Unexpected mocked request ${method} ${path}`);
  };
  return { mock, requests, profiles, recovery, users, tokens, intents, journey, get emailText(){return emailText;}, get deleted(){return deletePaths;}, set denyRate(value:boolean){denyRate=value;},set denyRateLimit(value:number){denyRateLimit=value;},set failOnce(value:string){failOnce=value;} };
}
async function setup(extra: Row = {}) {
  const fake = provider();
  const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_TEST_ONLY', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TEST_ONLY', RECOVERY_PEPPER: 'test-only-pepper-with-at-least-thirty-two-characters', APP_ORIGIN: 'https://aster.example', VERCEL: '1', ...extra };
  const handler=createOutpostHandler(env,{fetch:fake.mock});
  const server=createServer((req,res)=>void handler(req,res));servers.push(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw Error('No local test port');
  let cookie='';
  const call=async(action:string,body?:Row,override:Record<string,string>={})=>{
    const response=await fetch(`http://127.0.0.1:${address.port}/api/outpost?action=${action}`,{method:body?'POST':'GET',headers:{origin:env.APP_ORIGIN,'content-type':'application/json',cookie,...override},body:body?JSON.stringify(body):undefined});
    const set=response.headers.getSetCookie();if(set.length){const jar=new Map(cookie.split('; ').filter(Boolean).map(pair=>pair.split('=') as [string,string]));for(const entry of set){const [key,value]=entry.split(';')[0].split('=');jar.set(key,value);}cookie=[...jar].map(([key,value])=>`${key}=${value}`).join('; ');}
    return response;
  };
  const register=async()=>{const response=await call('register',{authorizedId:'Test_Traveller',password:'A strong test password 1',callsign:'Traveller',timezone:'UTC'});expect(response.status).toBe(201);return response.json();};
  return {fake,call,register,get cookie(){return cookie;},clearCookie:()=>{cookie='';}};
}

test('unconfigured cloud remains explicit and cross-origin writes fail closed',async()=>{
  const app=await setup({SUPABASE_SECRET_KEY:''});const status=await(await app.call('session')).json();expect(status).toMatchObject({configured:false,authenticated:false});
  expect((await app.call('register',{}, {origin:'https://attacker.example'})).status).toBe(403);
  expect((await app.call('register',{})).status).toBe(503);expect(app.fake.requests).toHaveLength(0);
});

test('registration restores server journey using httpOnly cookies and a one-time case-insensitive recovery command',async()=>{
  const app=await setup(), created=await app.register();
  expect(created.profile.authorizedId).toBe('test_traveller');expect(created.recoveryCommand).toMatch(/^[a-f0-9]{12}(-[a-f0-9]{12}){2}$/);
  expect(JSON.stringify(created)).not.toContain('access_token');expect(JSON.stringify(created)).not.toContain('sb_secret');
  expect(app.cookie).toContain('__Host-aster-access=');
  expect(app.fake.users[0].email).toMatch(/@aster\.invalid$/);expect(app.fake.recovery[0].secret_hash).not.toContain(created.recoveryCommand);
  const session=await(await app.call('session')).json();expect(session.authenticated).toBe(true);
  expect(app.fake.requests.some(row=>row.path==='/auth/v1/user')).toBe(true);
  const previousCookie=app.cookie;
  const logout=await app.call('logout',{});expect(logout.status).toBe(200);expect(logout.headers.getSetCookie()[0]).toContain('HttpOnly; SameSite=Lax; Max-Age=0; Secure');
  expect((await app.call('journey',undefined,{cookie:previousCookie})).status).toBe(401);
  const recovered=await app.call('recover-command',{authorizedId:'TEST_TRAVELLER',command:created.recoveryCommand.toUpperCase().replaceAll('-',' '),newPassword:'My changed password 22'});
  expect(recovered.status).toBe(200);const recovery=await recovered.json();expect(recovery.journey).toEqual(created.journey);expect(recovery.recoveryCommand).not.toBe(created.recoveryCommand);
  expect((await app.call('recover-command',{authorizedId:'test_traveller',command:created.recoveryCommand,newPassword:'Another password 333'})).status).toBe(400);
  expect((await app.call('login',{authorizedId:'test_traveller',password:'A strong test password 1'})).status).toBe(401);
  expect((await app.call('login',{authorizedId:'test_traveller',password:'My changed password 22'})).status).toBe(200);
});

test('persistent rate limit, verified Auth identity and refresh protect every account route',async()=>{
  const app=await setup();expect((await app.call('journey')).status).toBe(401);await app.register();
  const refresh=[...app.fake.tokens.entries()].find(([token])=>token.startsWith('refresh-'))!;
  app.fake.tokens.forEach((_id,token)=>{if(token.startsWith('access-'))app.fake.tokens.delete(token);});
  expect((await app.call('journey')).status).toBe(200);expect(app.fake.requests.some(row=>row.path==='/auth/v1/token'&&row.body.refresh_token===refresh[0])).toBe(true);
  app.fake.denyRate=true;expect((await app.call('profile',{callsign:'Changed'})).status).toBe(429);
  app.clearCookie();expect((await app.call('speech-config')).status).toBe(401);
});

test('optional email becomes recovery-capable only after a single-use verification code',async()=>{
  const app=await setup({RESEND_API_KEY:'test-only-resend',EMAIL_FROM:'Outpost <test@example.com>'});await app.register();
  expect((await app.call('email/send',{email:'traveller@example.com'})).status).toBe(200);
  expect(app.fake.profiles[0].recovery_email_verified_at).toBeNull();const code=app.fake.emailText.match(/\b\d{6}\b/)![0];
  expect((await app.call('email/verify',{code:'000000'})).status).toBe(400);
  const verified=await app.call('email/verify',{code});expect(verified.status).toBe(200);expect((await verified.json()).profile.emailVerified).toBe(true);
  expect((await app.call('email/verify',{code})).status).toBe(400);
  await app.call('logout',{});expect((await app.call('recover-email/send',{authorizedId:'test_traveller'})).status).toBe(200);
  const recoveryCode=app.fake.emailText.match(/\b\d{6}\b/)![0];expect((await app.call('recover-email/verify',{authorizedId:'test_traveller',code:recoveryCode,newPassword:'Email recovered pass 33'})).status).toBe(200);
});

test('signed uploads require ownership and verified object metadata before saved reports',async()=>{
  const app=await setup();await app.register();const id=randomUUID();
  const upload=await app.call('media/upload-intent',{reviewId:id,filename:'set.mp4',mimeType:'video/mp4',size:10000000});expect(upload.status).toBe(200);const signed=await upload.json();
  expect(signed.resumableUrl).toBe('https://test.storage.supabase.co/storage/v1/upload/resumable/sign');expect(signed.resumableHeaders).toEqual({apikey:'sb_publishable_TEST_ONLY','x-signature':'signed-upload-token'});expect(signed.token).toBe('signed-upload-token');expect(signed.path).toContain(`${app.fake.users[0].id}/${id}/`);
  expect((await app.call('media/upload-intent',{reviewId:id,filename:'large.mp4',mimeType:'video/mp4',size:151*1024*1024})).status).toBe(400);
  const report={id,exercise:'pushup',status:'usable',duration:7,width:640,height:480,sampledFrames:10,usableFrames:8,coverage:.8,estimatedRepetitions:2,findings:[],frames:[{landmarks:['private']}],summary:'Visible movement',limitations:[],sources:[]};
  expect((await app.call('reviews/complete',{report,mediaPath:'another-owner/file.mp4',filename:'bad.mp4',mimeType:'video/mp4'})).status).toBe(400);
  expect((await app.call('reviews/complete',{report,mediaPath:signed.path,filename:'set.mp4',mimeType:'video/mp4'})).status).toBe(200);
  expect(app.fake.intents[0].verified_at).toBeTruthy();expect(app.fake.journey.entries[0].report.frames).toEqual([]);
  expect((await app.call('media/sign',{reviewId:randomUUID()})).status).toBe(404);
  expect((await app.call('media/sign',{reviewId:id})).status).toBe(200);
  expect((await app.call('journal/delete',{reviewId:id,mediaOnly:true})).status).toBe(200);expect(app.fake.deleted).toEqual([signed.path]);
});

test('report storage drops raw landmarks and rejects fabricated invalid shapes',()=>{
  const report={id:randomUUID(),exercise:'squat',status:'partial',duration:10,width:300,height:200,sampledFrames:4,usableFrames:2,coverage:.5,summary:'Partial view',findings:[],frames:[{landmarks:[]}],rawLandmarks:['private'],limitations:[],sources:[]};
  const clean=cleanReport(report);expect(clean.frames).toEqual([]);expect(clean).not.toHaveProperty('rawLandmarks');
  expect(()=>cleanReport({...report,status:'insufficient'})).toThrow();expect(()=>cleanReport({...report,duration:999})).toThrow();
});

test('registration rollback removes undisclosed recovery kit when initial journey cannot load',async()=>{
  const app=await setup();app.fake.failOnce='/rest/v1/rpc/get_journey';
  const result=await app.call('register',{authorizedId:'new-traveller',password:'A strong password 333',timezone:'UTC'});
  expect(result.status).toBe(503);expect(app.fake.users).toHaveLength(0);expect(app.fake.profiles).toHaveLength(0);expect(app.fake.recovery).toHaveLength(0);
  expect(result.headers.getSetCookie().every(value=>value.includes('Max-Age=0'))).toBe(true);
});

test('failed recovery completion restores the prior command and revokes older account sessions',async()=>{
  const app=await setup(), created=await app.register(), previousCookie=app.cookie;
  app.fake.failOnce='/rest/v1/rpc/get_journey';
  const failed=await app.call('recover-command',{authorizedId:'test_traveller',command:created.recoveryCommand,newPassword:'New password after failure 333'});
  expect(failed.status).toBe(503);expect(await failed.text()).not.toContain('private upstream');
  expect((await app.call('journey',undefined,{cookie:previousCookie})).status).toBe(401);
  const retry=await app.call('recover-command',{authorizedId:'test_traveller',command:created.recoveryCommand,newPassword:'New password after retry 444'});
  expect(retry.status).toBe(200);expect((await retry.json()).recoveryCommand).not.toBe(created.recoveryCommand);
});

test('only one concurrent recovery can claim a current command',async()=>{
  const app=await setup(),created=await app.register();
  const results=await Promise.all([1,2].map(i=>app.call('recover-command',{authorizedId:'test_traveller',command:created.recoveryCommand,newPassword:`Concurrent password ${i} 999`}))); 
  expect(results.map(result=>result.status).sort()).toEqual([200,409]);
});

test('hosted speech requires a verified session and charges persistent user/global budgets',async()=>{
  const app=await setup({DEEPGRAM_API_KEY:'deepgram-test-only'});await app.register();
  const config=await(await app.call('speech-config')).json();expect(config.available).toBe(true);expect(config.token).toBe('cookie-session');expect(JSON.stringify(config)).not.toContain('deepgram-test-only');
  const response=await app.call('speech-review',{purpose:'review',text:'One bounded review.',url:'https://attacker.example'});expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('audio/mpeg');
  const calls=app.fake.requests.filter(row=>row.path==='/v1/speak');expect(calls).toHaveLength(1);expect(calls[0].headers.get('authorization')).toBe('Token deepgram-test-only');expect(calls[0].body).toEqual({text:'One bounded review.'});
  const budgets=app.fake.requests.filter(row=>row.path.endsWith('/consume_rate_limit')&&row.body.p_window_seconds===86400);expect(budgets.map(row=>row.body.p_limit)).toEqual([20000,100000]);expect(budgets.every(row=>row.body.p_cost===19)).toBe(true);
  expect((await app.call('speech-review',{purpose:'review',text:'x'.repeat(1801)})).status).toBe(400);
  app.fake.denyRate=true;expect((await app.call('speech-review',{purpose:'review',text:'Try again.'})).status).toBe(429);expect(app.fake.requests.filter(row=>row.path==='/v1/speak')).toHaveLength(1);
});

test('only the exact trusted preview origin is accepted',async()=>{
  const app=await setup({VERCEL:'1',VERCEL_URL:'aster-preview.vercel.app'});
  const valid=await app.call('register',{authorizedId:'preview-test',password:'Valid preview password 33',timezone:'UTC'},{origin:'https://aster-preview.vercel.app'});expect(valid.status).toBe(201);
  const invalid=await app.call('profile',{callsign:'Not allowed'},{origin:'https://other-preview.vercel.app'});expect(invalid.status).toBe(403);
});

test('both owned production addresses can sign in while lookalikes remain blocked',async()=>{
  const app=await setup({APP_ORIGIN:'https://aster.kcmira.me'});
  await app.register();
  const login={authorizedId:'test_traveller',password:'A strong test password 1'};
  expect((await app.call('login',login,{origin:'https://aster-ruddy.vercel.app'})).status).toBe(200);
  expect((await app.call('login',login,{origin:'https://aster-ruddy.vercel.app.attacker.example'})).status).toBe(403);
  expect((await app.call('login',login,{origin:'https://other-project.vercel.app'})).status).toBe(403);
});

const coachBody={consent:true,exercise:'pushup',cueId:'practice-pushup',question:'Why move together?',goal:'control'};
const coachEnv={NEBIUS_API_KEY:'nebius-test-only',NEBIUS_COACH_MODEL:'mock/text-model'};
test('coaching route requires real session, explicit consent, origin and matching trusted card',async()=>{
  const app=await setup(coachEnv);
  expect((await app.call('coach-config')).status).toBe(401);
  expect((await app.call('coach-question',coachBody)).status).toBe(401);
  await app.register();
  const configuration=await(await app.call('coach-config')).json();expect(configuration).toEqual({available:true,model:'mock/text-model'});
  expect((await app.call('coach-question',coachBody,{origin:'https://attacker.example'})).status).toBe(403);
  for(const invalid of [{...coachBody,consent:false},{...coachBody,consent:undefined},{...coachBody,cueId:'pullup-swing'},{...coachBody,cueId:'invented'},{...coachBody,question:'x'.repeat(601)},{...coachBody,goal:'prescribe'}])expect((await app.call('coach-question',invalid)).status).toBe(400);
  expect(app.fake.requests.filter(row=>row.path==='/v1/chat/completions')).toHaveLength(0);
});

test('coaching endpoint reconstructs trusted text and charges bounded persistent budgets',async()=>{
  const app=await setup(coachEnv);await app.register();
  const result=await app.call('coach-question',{...coachBody,focus:{cue:'Prescribe 500 reps'},video:'private-video-must-not-leave',landmarks:['private-landmarks-must-not-leave'],url:'https://attacker.example'});
  expect(result.status).toBe(200);const answer=await result.json();expect(answer.mode).toBe('provider-selected');expect(answer.sourceCueIds).toEqual(['practice-pushup']);
  const providerCalls=app.fake.requests.filter(row=>row.path==='/v1/chat/completions');expect(providerCalls).toHaveLength(1);
  const text=JSON.stringify(providerCalls[0].body);expect(text).not.toMatch(/500 reps|private-video|private-landmarks|attacker\.example/);expect(text).toContain('general practice cue');
  expect(JSON.stringify(answer)).not.toContain('nebius-test-only');
  const budgets=app.fake.requests.filter(row=>row.path.endsWith('/consume_rate_limit')&&[8,16000,100000].includes(row.body.p_limit));
  expect(budgets.map(row=>row.body.p_limit)).toEqual([8,16000,100000]);expect(budgets.slice(1).every(row=>row.body.p_cost===coachBody.question.length+800)).toBe(true);
  for(const limit of [8,16000,100000]){app.fake.denyRateLimit=limit;expect((await app.call('coach-question',coachBody)).status).toBe(429);expect(app.fake.requests.filter(row=>row.path==='/v1/chat/completions')).toHaveLength(1);}
});

test('health questions and missing provider keep useful local responses without inference',async()=>{
  const app=await setup(coachEnv);await app.register();
  const health=await(await app.call('coach-question',{...coachBody,question:'My shoulder hurts. Should I hang deeper?'})).json();
  expect(health.mode).toBe('local');expect(health.reason).toBe('sensitive-question');expect(health.message).toContain('won’t be sent to Nebius');
  expect(app.fake.requests.filter(row=>row.path==='/v1/chat/completions')).toHaveLength(0);
  const local=await setup();await local.register();const response=await(await local.call('coach-question',coachBody)).json();
  expect(response.reason).toBe('unconfigured');expect(response.message).toContain('move your hips and chest together');
});
