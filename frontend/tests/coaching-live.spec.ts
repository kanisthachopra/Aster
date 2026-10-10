import { test, expect } from '@playwright/test';
import { loadEnv } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { explainCoachQuestion } from '../server/coachingService';
import { trustedCoachingCard } from '../src/analysis/coachingCards';

test('opt-in actual provider selects a bounded synthetic educational answer',async()=>{
  test.skip(process.env.ASTER_LIVE_COACHING!=='1','Requires explicit authorization for one small provider request.');
  const env=loadEnv('deployment',process.cwd(),'');
  if(!env.NEBIUS_API_KEY||!env.NEBIUS_COACH_MODEL)throw new Error('Server provider configuration is missing.');
  const focus=trustedCoachingCard('pushup','practice-pushup')!;
  let providerDiagnostic:Record<string,unknown>={};
  const start=Date.now();const result=await explainCoachQuestion(env,{exercise:'pushup',question:'Why does moving my hips and chest together help?',focus,goal:'control'},{fetch:async(input,init)=>{
    const response=await fetch(input,init);
    if(response.ok){const body=await response.clone().json();providerDiagnostic={finishReason:body.choices?.[0]?.finish_reason,usage:body.usage,content:body.choices?.[0]?.message?.content};}
    else providerDiagnostic={status:response.status};
    return response;
  }});
  const audit={checkedAt:new Date().toISOString(),mode:result.mode,reason:result.reason??null,sourceCueIds:result.sourceCueIds,elapsedMs:Date.now()-start,providerCalls:1,syntheticQuestion:true,privateMediaSent:false,healthContextSent:false,providerDiagnostic};
  mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/coaching-provider-verification.json',JSON.stringify(audit,null,2)+'\n');
  console.log(JSON.stringify(audit));
  expect(result.mode,result.reason).toBe('provider-selected');expect(result.sourceCueIds).toEqual(['practice-pushup']);
  expect(result.message.includes(focus.why)||result.message.includes(focus.cue)||result.message.includes(focus.observation)).toBeTruthy();
});
