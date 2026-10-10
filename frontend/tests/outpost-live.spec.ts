import { test } from '@playwright/test';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';
import { Upload } from 'tus-js-client';
import { createOutpostHandler } from '../server/outpost';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

// Explicit opt-in only. All credentials and recovery commands remain in memory.
// This creates two disposable accounts and removes their objects/users afterward.
test('live Supabase account recovery, ownership, private video and durable journal', async () => {
  test.skip(process.env.ASTER_LIVE_ACCOUNTS !== '1', 'Run only after the actual Supabase migration is applied.');
  test.setTimeout(240000);
  const prefixes = ['SUPABASE_', 'APP_ORIGIN', 'RECOVERY_', 'RESEND_', 'EMAIL_'];
  const env = { ...loadEnv('deployment', process.cwd(), prefixes), ...loadEnv('development', process.cwd(), prefixes) };
  for (const name of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'RECOVERY_PEPPER']) if (!env[name]) throw Error(`Required server setting missing: ${name}`);
  const owners: string[] = [], paths: string[] = [], checks: string[] = [];
  const verify = (condition: boolean, label: string) => { if (!condition) throw Error(`Hosted verification failed: ${label}`); checks.push(label); };
  const admin = async (path: string, method: string, body?: unknown) => {
    const headers: Record<string,string> = { apikey: env.SUPABASE_SECRET_KEY, 'Content-Type':'application/json' };
    if (env.SUPABASE_SECRET_KEY.split('.').length === 3) headers.Authorization = `Bearer ${env.SUPABASE_SECRET_KEY}`;
    return fetch(`${env.SUPABASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(15000) });
  };
  const server=createServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw Error('No local integration port');
  const origin=`http://127.0.0.1:${address.port}`;
  const handler=createOutpostHandler({...env,APP_ORIGIN:origin,VERCEL:'1'});server.on('request',(req,res)=>void handler(req,res));
  // Emulate a trusted hosting-proxy test address, isolating QA limits from a user's localhost account attempts.
  const testAddress=`198.51.100.${1+randomBytes(1)[0]%253}`;
  function client() {
    const jar=new Map<string,string>();
    return { async call(action:string,body?:unknown) {
      const response=await fetch(`${origin}/api/outpost?action=${encodeURIComponent(action)}`, {method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-vercel-forwarded-for':testAddress,cookie:[...jar].map(([key,value])=>`${key}=${value}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
      for(const entry of response.headers.getSetCookie()){const [key,...value]=entry.split(';')[0].split('=');jar.set(key,value.join('='));}
      const result=await response.json();return {status:response.status,result,cookies:response.headers.getSetCookie()};
    }};
  }
  let failure: unknown;
  try {
    const first=client(),second=client(),id=`qa_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`,secret=`Test-${randomBytes(18).toString('hex')}`;
    const registration=await first.call('register',{authorizedId:id,password:secret,callsign:'Disposable verification',timezone:'UTC'});
    verify(registration.status===201,'first account created');owners.push(registration.result.profile.id);
    const recoveryCommand=registration.result.recoveryCommand;
    verify(/^[a-f0-9]{12}(-[a-f0-9]{12}){2}$/.test(recoveryCommand),'generated three-chunk recovery kit');
    verify(registration.cookies.every(value=>value.includes('HttpOnly')&&value.includes('SameSite=Lax')),'credentials stay in HttpOnly cookies');
    const restored=await first.call('session');verify(restored.result.authenticated&&Array.isArray(restored.result.journey.entries),'session restores complete journey');
    const registration2=await second.call('register',{authorizedId:`${id}b`,password:secret,callsign:'Other disposable traveller',timezone:'UTC'});
    verify(registration2.status===201,'second isolated account created');owners.push(registration2.result.profile.id);
    const reviewId=randomUUID(),bytes=await readFile('tests/fixtures/playback.mp4');
    const intent=await first.call('media/upload-intent',{reviewId,filename:'verification.mp4',mimeType:'video/mp4',size:bytes.length});
    verify(intent.status===200,'private upload intent issued');paths.push(intent.result.path);
    const uploaded=await fetch(intent.result.uploadUrl,{method:'PUT',headers:{'Content-Type':'video/mp4'},body:bytes,signal:AbortSignal.timeout(30000)});verify(uploaded.ok,'actual private video uploaded directly');await uploaded.body?.cancel();
    // Synthetic report tests persistence only; it is never evidence of form accuracy.
    const report={id:reviewId,exercise:'pushup',status:'usable',duration:2,width:320,height:180,sampledFrames:4,usableFrames:4,coverage:1,estimatedRepetitions:1,findings:[],frames:[],summary:'Disposable persistence verification, not a form assessment.',limitations:['Synthetic test report; not exercise evidence.'],sources:[]};
    const saved=await first.call('reviews/complete',{report,mediaPath:intent.result.path,filename:'verification.mp4',mimeType:'video/mp4'});
    verify(saved.status===200&&saved.result.entries.some((entry:{id:string})=>entry.id===reviewId),'review committed with verified stored object');
    verify(saved.result.regular===5&&saved.result.activity.length===1,'first server activity earns exactly five credits');
    const duplicate=await first.call('reviews/complete',{report});verify(duplicate.status===200&&duplicate.result.regular===5,'duplicate report cannot double award');
    const signed=await first.call('media/sign',{reviewId});verify(signed.status===200,'owner gets temporary playback URL');
    const playback=await fetch(signed.result.url,{signal:AbortSignal.timeout(15000)});verify(playback.ok,'signed private playback retrieves video');await playback.body?.cancel();
    const foreign=await second.call('media/sign',{reviewId});verify(foreign.status===404,'other account cannot sign owner recording');
    verify((await second.call('journey')).result.entries.length===0,'other account sees no owner journal entries');
    // A valid MP4 free box pads the public synthetic fixture past the TUS threshold.
    const large=Buffer.alloc(7*1024*1024);bytes.copy(large);large.writeUInt32BE(large.length-bytes.length,bytes.length);large.write('free',bytes.length+4);
    const largeIntent=await first.call('media/upload-intent',{reviewId:randomUUID(),filename:'large-verification.mp4',mimeType:'video/mp4',size:large.length});
    verify(largeIntent.status===200,'large private upload intent issued');paths.push(largeIntent.result.path);
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>{void upload.abort();reject(Error('Hosted verification failed: signed TUS deadline'));},90000);
      const upload=new Upload(large,{endpoint:largeIntent.result.resumableUrl,headers:largeIntent.result.resumableHeaders,chunkSize:6*1024*1024,uploadDataDuringCreation:true,storeFingerprintForResuming:false,removeFingerprintOnSuccess:true,retryDelays:[0,1000],metadata:{bucketName:largeIntent.result.bucketName,objectName:largeIntent.result.objectName,contentType:'video/mp4',cacheControl:'0'},onSuccess:()=>{clearTimeout(timer);resolve();},onError:error=>{clearTimeout(timer);const detail=error as {originalResponse?:{getStatus:()=>number;getBody:()=>string};causingError?:{code?:string}};let code='';try{code=JSON.parse(detail.originalResponse?.getBody()||'{}').code||'';}catch{}reject(Error(`Hosted verification failed: signed TUS upload (status ${detail.originalResponse?.getStatus()??'network'}, code ${/^[a-z0-9_ -]{0,80}$/i.test(code)?code:'unavailable'}, network ${detail.causingError?.code||'none'})`));}});upload.start();
    });
    const largeInfo=await admin(`/storage/v1/object/info/aster-recordings/${largeIntent.result.path}`,'GET');const storedLarge=await largeInfo.json();verify(largeInfo.ok&&Number(storedLarge.size??storedLarge.metadata?.size)===large.length,'seven-MiB signed TUS upload matches stored byte count');
    verify((await first.call('logout',{})).status===200,'logout succeeds');verify((await first.call('session')).result.authenticated===false,'logout removes account session');
    const changed=`Changed-${randomBytes(18).toString('hex')}`;
    const recovered=await first.call('recover-command',{authorizedId:id.toUpperCase(),command:recoveryCommand.toUpperCase().replaceAll('-',' '),newPassword:changed});
    verify(recovered.status===200&&recovered.result.journey.entries.some((entry:{id:string})=>entry.id===reviewId),'case-insensitive command restores full journey');
    verify(recovered.result.recoveryCommand!==recoveryCommand,'successful recovery rotates command');
    verify((await first.call('recover-command',{authorizedId:id,command:recoveryCommand,newPassword:secret})).status===400,'used recovery command is rejected');
    const mediaDeleted=await first.call('journal/delete',{reviewId,mediaOnly:true});verify(mediaDeleted.status===200&&mediaDeleted.result.entries.some((entry:{id:string;media_path:string|null})=>entry.id===reviewId&&entry.media_path===null),'media deletion preserves written journal');
    const removed=await admin(`/storage/v1/object/info/aster-recordings/${intent.result.path}`,'GET');verify(!removed.ok,'deleted object is absent from Storage origin');await removed.body?.cancel();
    const deleted=await first.call('journal/delete',{reviewId,mediaOnly:false});verify(deleted.status===200&&deleted.result.entries.length===0&&deleted.result.regular===5,'journal deletion retains earned accounting only');
    verify((await first.call('login',{authorizedId:id,password:changed})).status===200,'new password signs into restored account');
  } catch (error) { failure=error; }
  finally {
    let cleanupOk=true;
    for(const path of paths){try{const response=await admin('/storage/v1/object/aster-recordings','DELETE',{prefixes:[path]});cleanupOk=response.ok&&cleanupOk;await response.body?.cancel();}catch{cleanupOk=false;}}
    for(const owner of owners){try{const response=await admin(`/auth/v1/admin/users/${owner}`,'DELETE');cleanupOk=response.ok&&cleanupOk;await response.body?.cancel();}catch{cleanupOk=false;}}
    server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
    await mkdir('artifacts',{recursive:true});await writeFile('artifacts/outpost-live-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,disposableAccounts:owners.length,cleanupOk,passed:!failure&&cleanupOk,limitations:'Synthetic report tests persistence only. No real exercise quality, email delivery, paid speech or Vercel routing verified.'},null,2));
    if(!cleanupOk&&!failure)failure=Error('Hosted verification cleanup needs attention. See aggregate artifact.');
  }
  if(failure)throw failure;
});
