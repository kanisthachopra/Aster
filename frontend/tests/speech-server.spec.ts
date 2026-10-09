import { test, expect } from '@playwright/test';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { createSpeechMiddleware } from '../server/speech';
import { chunkSpeechText } from '../src/speech/chunks';

const servers: Server[] = [];
test.afterEach(async () => { for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } });
async function setup(env: Record<string,string> = {}, mock: typeof fetch = async () => new Response(new Uint8Array([73,68,51]), {headers:{'content-type':'audio/mpeg'}}), timeoutMs=1000, now?:()=>number) {
  const middleware = createSpeechMiddleware(env, {fetch:mock,timeoutMs,now});
  const server = createServer((req,res) => { void middleware(req,res,()=>{res.statusCode=404;res.end();}); });
  servers.push(server); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address(); if (!address || typeof address==='string') throw new Error('No test server');
  const origin=`http://127.0.0.1:${address.port}`;
  const config=await (await fetch(`${origin}/api/speech/config`)).json();
  const post=(body:unknown,headers:Record<string,string>={})=>fetch(`${origin}/api/speech/review`,{method:'POST',headers:{origin,'content-type':'application/json','x-aster-speech-token':config.token,...headers},body:JSON.stringify(body)});
  return {origin,config,post};
}

test('speech config reports unavailable without exposing a key or contacting a provider', async()=>{
  let called=0;
  const {config,post}=await setup({},async()=>{called++;throw new Error('Must not call');});
  expect(config.available).toBe(false); expect(config.message).toContain('.env.local');
  expect(config).not.toHaveProperty('apiKey');
  expect((await post({purpose:'review',text:'A review.'})).status).toBe(503);
  expect(called).toBe(0);
});

test('speech rejects cross-origin, wrong token, arbitrary options and excessive body',async()=>{
  let called=0; const {post}=await setup({DEEPGRAM_API_KEY:'mock-key-for-test'},async()=>{called++;throw new Error('Must not call');});
  expect((await post({purpose:'review',text:'A review.'},{origin:'https://elsewhere.example'})).status).toBe(403);
  expect((await post({purpose:'review',text:'A review.'},{'x-aster-speech-token':'wrong'})).status).toBe(403);
  expect((await post({purpose:'review',text:'A review.',url:'https://elsewhere.example'})).status).toBe(400);
  expect((await post({purpose:'anything',text:'A review.'})).status).toBe(400);
  expect((await post({purpose:'review',text:'a'.repeat(1801)})).status).toBe(400);
  expect((await post({purpose:'review',text:'a'.repeat(9000)})).status).toBe(413);
  expect(called).toBe(0);
});

test('speech uses fixed provider, opts out, caches exact replays and enforces bounded budget',async()=>{
  const calls: Array<{url:string,body:string,authorized:boolean}>=[];
  const {post,origin}=await setup({DEEPGRAM_API_KEY:'mock-key-for-test',DEEPGRAM_SESSION_CHAR_BUDGET:'1800'},async(input,init)=>{
    calls.push({url:String(input),body:String(init?.body),authorized:new Headers(init?.headers).get('authorization')==='Token mock-key-for-test'});
    return new Response(new Uint8Array([73,68,51]),{headers:{'content-type':'audio/mpeg'}});
  });
  const first=await post({purpose:'review',text:'a'.repeat(1000)}); expect(first.status).toBe(200); expect(first.headers.get('x-aster-speech-cache')).toBe('miss');
  expect((await post({purpose:'review',text:'a'.repeat(1000)})).headers.get('x-aster-speech-cache')).toBe('hit');
  expect((await post({purpose:'review',text:'b'.repeat(900)})).status).toBe(429);
  expect(calls).toHaveLength(1); expect(calls[0].authorized).toBe(true);
  const url=new URL(calls[0].url); expect(url.origin).toBe('https://api.deepgram.com'); expect(url.searchParams.get('mip_opt_out')).toBe('true'); expect(url.searchParams.get('model')).toBe('aura-2-thalia-en');
  expect(JSON.parse(calls[0].body)).toEqual({text:'a'.repeat(1000)});
  const config=await (await fetch(`${origin}/api/speech/config`)).json(); expect(config.remainingCharacters).toBe(800); expect(JSON.stringify(config)).not.toContain('mock-key-for-test');
});

test('exhausted budget is explicit, cached replay remains free, and usage expires after 24 hours',async()=>{
  let clock=1000000,calls=0;
  const {post,origin}=await setup({DEEPGRAM_API_KEY:'mock-key-for-test',DEEPGRAM_SESSION_CHAR_BUDGET:'1800'},async()=>{calls++;return new Response(new Uint8Array([73,68,51]),{headers:{'content-type':'audio/mpeg'}});},1000,()=>clock);
  expect((await post({purpose:'review',text:'a'.repeat(1800)})).status).toBe(200);
  const exhausted=await (await fetch(`${origin}/api/speech/config`)).json();
  expect(exhausted.available).toBe(false);expect(exhausted.remainingCharacters).toBe(0);expect(exhausted.retryAfterSeconds).toBe(86400);
  expect((await post({purpose:'review',text:'a'.repeat(1800)})).headers.get('x-aster-speech-cache')).toBe('hit');
  const refused=await post({purpose:'review',text:'Another review.'});expect(refused.status).toBe(429);expect(refused.headers.get('retry-after')).toBe('86400');
  expect(calls).toBe(1); clock+=24*60*60*1000;
  const renewed=await (await fetch(`${origin}/api/speech/config`)).json();expect(renewed.available).toBe(true);expect(renewed.remainingCharacters).toBe(1800);
  expect((await post({purpose:'review',text:'Another review.'})).status).toBe(200);expect(calls).toBe(2);
});

test('speech sanitizes provider errors and aborts slow generation',async()=>{
  const failed=await setup({DEEPGRAM_API_KEY:'mock-key-for-test'},async()=>new Response('provider-private-debug',{status:401}));
  const response=await failed.post({purpose:'review',text:'A review.'}); expect(response.status).toBe(502); const message=await response.text(); expect(message).toContain('did not accept'); expect(message).not.toContain('provider-private-debug');
  let aborted=false;
  const slow=await setup({DEEPGRAM_API_KEY:'mock-key-for-test'},async(_input,init)=>new Promise((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>{aborted=true;reject(new Error('private upstream timeout'));});}),30);
  const timeout=await slow.post({purpose:'review',text:'A different review.'}); expect(timeout.status).toBe(504); expect(aborted).toBe(true); expect(await timeout.text()).not.toContain('private upstream');
});

test('speech limits repeated uncached requests and blocks forged host headers',async()=>{
  let called=0;
  const {post,origin}=await setup({DEEPGRAM_API_KEY:'mock-key-for-test'},async()=>{called++;return new Response(new Uint8Array([73,68,51]),{headers:{'content-type':'audio/mpeg'}});});
  const forged=await new Promise<number|undefined>((resolve,reject)=>{const request=httpRequest(`${origin}/api/speech/config`,{headers:{Host:'untrusted.example'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end();});
  expect(forged).toBe(403);
  expect((await post({purpose:'review',text:'A review.'},{origin:''})).status).toBe(403);
  for(let i=0;i<6;i++) expect((await post({purpose:'review',text:`Review ${i}.`})).status).toBe(200);
  expect((await post({purpose:'review',text:'Seventh uncached review.'})).status).toBe(429);
  expect(called).toBe(6);
});

test('speech chunks preserve complete thoughts and reject silent truncation',()=>{
  const sentences=Array.from({length:18},(_,i)=>`Observation ${i+1}: ${'measured movement '.repeat(14)}remains uncertain.`);
  const chunks=chunkSpeechText(sentences.join(' '));
  expect(chunks.length).toBeGreaterThan(1); expect(chunks.every(chunk=>chunk.length<=1800)).toBe(true);
  expect(chunks.join(' ')).toBe(sentences.join(' '));
  expect(()=>chunkSpeechText('x'.repeat(6001))).toThrow('6000');
  expect(()=>chunkSpeechText('x'.repeat(1801))).toThrow('sentence');
});
