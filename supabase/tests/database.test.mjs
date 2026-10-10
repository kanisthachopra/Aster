import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL WASM execution, with explicit stand-ins for Supabase's hosted
// auth/storage schemas. This does NOT test GoTrue, object bytes, HTTP or PostgREST.
let db;
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const id=n=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
const report=(n,status='usable')=>({id:id(n),exercise:'pushup',status,frames:[{landmarks:[{x:.5,y:.5}]}],trackedFrames:[1],findings:[]});
const query=async(sql,params=[])=>db.query(sql,params);
const value=async(sql,params=[])=>Object.values((await query(sql,params)).rows[0])[0];
async function role(name,user=owner){await db.exec(`reset role; set role ${name};`);await query("select set_config('request.jwt.claim.sub',$1,false)",[user]);}
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to public;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;
 insert into auth.users values('${owner}'),('${other}');`);
 await db.exec(readFileSync(new URL('../migrations/202610100001_aster_accounts_journey.sql',import.meta.url),'utf8'));
 await query("insert into public.profiles(id,authorized_id,callsign,created_at) values($1,' Explorer_One ','One',now()-interval '90 days'),($2,'explorer_two','Two',now()-interval '90 days')",[owner,other]);
});
after(async()=>{await db?.close();});

test('profile IDs normalize and timezone validation prevents invalid or retrospective calendars',async()=>{
 assert.equal(await value('select authorized_id from profiles where id=$1',[owner]),'explorer_one');
 await assert.rejects(query("update profiles set timezone='Bogus/Zone' where id=$1",[owner]),/Invalid timezone/);
 await role('authenticated');
 assert.equal(await value('select count(*)::int from profiles'),1);
 await assert.rejects(query("update profiles set callsign='Changed' where id=$1",[owner]),/permission denied/);
 await assert.rejects(query('select * from recovery_credentials'),/permission denied/);
 await assert.rejects(query('select public.consume_rate_limit($1,10,60,1)',['anonymous-test']),/permission denied/);
});

test('partial reviews persist without awards; concurrent requests are idempotent and one daily award wins',async()=>{
 await role('authenticated');
 let j=await value('select complete_review($1::jsonb)',[JSON.stringify(report(1,'partial'))]);
 assert.equal(j.entries.length,1);assert.equal(j.regular,0);assert.equal(j.activity.length,0);
 await Promise.all(Array.from({length:8},(_,i)=>value('select complete_review($1::jsonb)',[JSON.stringify(report(i%2+2))])));
 j=await value('select get_journey()');assert.equal(j.regular,5);assert.equal(j.activity.length,1);assert.equal(j.entries.length,3);
 await assert.rejects(value('select complete_review($1::jsonb)',[JSON.stringify(report(8,'insufficient'))]),/not eligible/);
 await assert.rejects(value('select complete_review($1::jsonb)',[JSON.stringify({exercise:'pushup',status:'usable'})]),/not eligible/);
 await role('authenticated',other);assert.equal(await value('select count(*)::int from reviews'),0);
 const otherJourney=await value('select get_journey()');assert.equal(otherJourney.entries.length,0);
 await assert.rejects(value('select complete_review($1::jsonb)',[JSON.stringify(report(2))]),/unavailable/);
 await role('service_role');await assert.rejects(query("update profiles set timezone='Asia/Singapore' where id=$1",[owner]),/calendar migration/);
});

test('media association requires a verified matching owner intent; source deletion clears raw tracks and keeps award receipts',async()=>{
 const path=`${owner}/${id(10)}/clip.mp4`;
 await role('service_role');await query("insert into media_uploads(path,owner_id,review_id,expected_bytes,mimetype,expires_at) values($1,$2,$3,100,'video/mp4',now()+interval '1 hour')",[path,owner,id(10)]);
 await role('authenticated');
 await assert.rejects(value('select complete_review($1::jsonb,$2,$3,$4)',[JSON.stringify(report(10)),path,'clip.mp4','video/mp4']),/not verified/);
 await role('service_role');await query('update media_uploads set verified_at=now() where path=$1',[path]);
 await role('authenticated',other);await assert.rejects(value('select complete_review($1::jsonb,$2,$3,$4)',[JSON.stringify(report(10)),path,'clip.mp4','video/mp4']),/not verified/);
 await role('authenticated');await value('select complete_review($1::jsonb,$2,$3,$4)',[JSON.stringify(report(10)),path,'clip.mp4','video/mp4']);
 assert.equal(await value('select delete_review($1,true)',[id(10)]),path);
 const stored=await value('select report from reviews where id=$1',[id(10)]);assert.deepEqual(stored.frames,[]);assert.equal(stored.trackedFrames,undefined);assert.equal(stored.sourceMediaDeleted,true);
 await value('select delete_review($1,false)',[id(10)]);
 await value('select complete_review($1::jsonb)',[JSON.stringify(report(10))]);
 assert.equal(await value('select count(*)::int from reviews where id=$1',[id(10)]),0);
 const j=await value('select get_journey()');assert.equal(j.regular,5);assert.equal(j.activity.length,1);
 await role('service_role');assert.equal(await value('select count(*)::int from media_deletion_queue where path=$1',[path]),1);
});

test('recovery rotation, email-code claim and global character limiter each allow one atomic winner',async()=>{
 await role('service_role');
 const secret='h'.repeat(64),salt='s'.repeat(32);
 await query('insert into recovery_credentials(owner_id,salt,secret_hash) values($1,$2,$3)',[owner,salt,secret]);
 const rotated=await Promise.all(Array.from({length:5},()=>value('select rotate_recovery($1,1,$2,$3,$4)',[owner,secret,salt,'n'.repeat(64)])));
 assert.equal(rotated.filter(Boolean).length,1);
 await query("insert into recovery_email_codes values($1,'recover','owner@example.test',$2,$3,now()+interval '10 minutes',0)",[owner,salt,secret]);
 const claimed=await Promise.all(Array.from({length:5},()=>value("select consume_email_code($1,'recover',$2)",[owner,secret])));assert.equal(claimed.filter(Boolean).length,1);
 const rates=await Promise.all(Array.from({length:10},()=>value("select consume_rate_limit('speech:global:chars',1000,60,200)")));
 assert.equal(rates.filter(r=>r.allowed).length,5);assert.ok(rates.filter(r=>!r.allowed).every(r=>r.retry_after>0));
});

test('five award amounts and seven-day rollover use exact units; reserve cap and repeated settlement hold',async()=>{
 await db.exec('reset role');
 const p='33333333-3333-4333-8333-333333333333';
 await query("insert into auth.users values($1);",[p]);await query("insert into profiles(id,authorized_id,callsign,created_at) values($1,'calendar_test','Calendar',now()-interval '90 days')",[p]);
 const monday=await value("select aster_private.week_start(current_date)-7");
 await query('insert into energy_state(owner_id,week,reserve_units) values($1,$2,198)',[p,monday]);
 // Fixture history represents independently completed prior days. It does not
 // override the public RPC's server calendar or expose a client-controlled date.
 const awards=[10,10,10,5,5,0,0];
 for(let i=0;i<7;i++)await query("insert into journey_ledger(owner_id,kind,day,charged_week,regular_delta,reserve_delta) values($1,'activity',$2::date+$3::int,$2,$4,0)",[p,monday,i,awards[i]]);
 await query('update energy_state set regular_units=40 where owner_id=$1',[p]);
 await query('select aster_private.settle($1,current_date)',[p]);await query('select aster_private.settle($1,current_date)',[p]);
 const s=(await query('select regular_units,reserve_units from energy_state where owner_id=$1',[p])).rows[0];assert.deepEqual(s,{regular_units:0,reserve_units:200});
 assert.equal(await value("select count(*)::int from journey_ledger where owner_id=$1 and kind='rollover'",[p]),1);
});

test('protection spends regular first, requires reserve confirmation, enforces three per target week and preserves activity',async()=>{
 await db.exec('reset role');
 await query('update energy_state set regular_units=10,reserve_units=100 where owner_id=$1',[other]);
 const yesterday=await value('select current_date-1');
 await role('authenticated',other);
 await assert.rejects(value('select protect_day($1,false)',[yesterday]),/Confirm spending reserve/);
 let j=await value('select protect_day($1,true)',[yesterday]);assert.equal(j.regular,0);assert.equal(j.reserve,45);assert.equal(j.activity.length,0);
 j=await value('select protect_day($1,true)',[yesterday]);assert.equal(j.reserve,45);
 await assert.rejects(value('select protect_day(current_date,true)'),/earlier missed/);
 await db.exec('reset role');const week=await value('select aster_private.week_start(current_date)-7');
 await role('authenticated',other);
 for(let i=0;i<3;i++)await value('select protect_day($1::date+$2::int,true)',[week,i]);
 await assert.rejects(value('select protect_day($1::date+3,true)',[week]),/Weekly protection limit/);
 await assert.rejects(query('update journey_ledger set regular_delta=100'),/permission denied/);
 await assert.rejects(query('delete from energy_state'),/permission denied/);
});

test('public completion award curve and rollover match seven actual account days',async()=>{
 await db.exec('reset role');
 const original=await value("select pg_get_functiondef('aster_private.owner_day(uuid)'::regprocedure)");
 // Test-only clock substitution: public RPC callers never have this date input.
 await db.exec("create or replace function aster_private.owner_day(p_owner uuid) returns date language sql stable security definer set search_path='' as $$select current_setting('aster.test_day')::date$$");
 try {
   const p='44444444-4444-4444-8444-444444444444';
   await query('insert into auth.users values($1)',[p]);await query("insert into profiles(id,authorized_id,callsign,created_at) values($1,'seven_days','Seven','2020-01-01')",[p]);
   await role('authenticated',p);
   for(let i=0;i<7;i++){
     await query("select set_config('aster.test_day',($1::date+$2::int)::text,false)",['2030-01-07',i]);
     const j=await value('select complete_review($1::jsonb)',[JSON.stringify(report(100+i))]);
     assert.equal(j.regular,[5,10,15,17.5,20,20,20][i]);assert.equal(j.activity.length,i+1);
   }
   await query("select set_config('aster.test_day','2030-01-14',false)");
   let j=await value('select get_journey()');assert.equal(j.regular,0);assert.equal(j.reserve,2.5);
   j=await value('select get_journey()');assert.equal(j.reserve,2.5);
 }finally{await db.exec('reset role');await db.exec(original);}
});

test('incomplete weeks and protection spending cannot earn seven-day reserve',async()=>{
 await db.exec('reset role');
 const week=await value('select aster_private.week_start(current_date)-7');
 for(const [number,days,protection]of [[5,6,false],[6,7,true]]){
   const p=`${number}${'5'.repeat(7)}-5555-4555-8555-555555555555`;
   await query('insert into auth.users values($1)',[p]);await query("insert into profiles(id,authorized_id,callsign) values($1,$2,'Fixture')",[p,`reserve_case_${number}`]);
   await query('insert into energy_state(owner_id,week,regular_units) values($1,$2,20)',[p,week]);
   for(let i=0;i<days;i++)await query("insert into journey_ledger(owner_id,kind,day,charged_week,regular_delta,reserve_delta) values($1,'activity',$2::date+$3::int,$2,0,0)",[p,week,i]);
   if(protection)await query("insert into journey_ledger(owner_id,kind,day,charged_week,regular_delta,reserve_delta) values($1,'protection',$2::date-1,$2,-20,0)",[p,week]);
   await query('select aster_private.settle($1,current_date)',[p]);
   assert.equal(await value('select reserve_units from energy_state where owner_id=$1',[p]),0);
 }
});

test('application session digests are service-only, revocable and cascade with the owner',async()=>{
 await role('service_role');const hash='a'.repeat(64);
 await query('insert into app_sessions(id_hash,owner_id) values($1,$2)',[hash,owner]);
 assert.equal(await value('select count(*)::int from app_sessions where id_hash=$1 and expires_at>now()',[hash]),1);
 await role('authenticated',owner);await assert.rejects(query('select * from app_sessions'),/permission denied/);
 await assert.rejects(query('delete from app_sessions where id_hash=$1',[hash]),/permission denied/);
 await role('anon','');await assert.rejects(query('select * from app_sessions'),/permission denied/);
 await role('service_role');await query('delete from app_sessions where id_hash=$1',[hash]);
 assert.equal(await value('select count(*)::int from app_sessions where id_hash=$1',[hash]),0);
 await db.exec('reset role');const p='77777777-7777-4777-8777-777777777777';
 await query('insert into auth.users values($1)',[p]);await query("insert into profiles(id,authorized_id,callsign) values($1,'session_fixture','Session')",[p]);
 await role('service_role');await query('insert into app_sessions(id_hash,owner_id) values($1,$2)',[hash,p]);
 await db.exec('reset role');await query('delete from auth.users where id=$1',[p]);
 assert.equal(await value('select count(*)::int from app_sessions where owner_id=$1',[p]),0);
});

test('private bucket reads require a retained owned review; anonymous access and service ledger mutation fail',async()=>{
 await db.exec('reset role');const path=`${owner}/${id(888)}/file.mp4`;
 await query("insert into storage.objects(bucket_id,name) values('aster-recordings',$1)",[path]);
 await query("insert into reviews(id,owner_id,day,exercise,status,report,media_path) values($1,$2,current_date,'pushup','partial','{}',$3)",[id(888),owner,path]);
 await role('authenticated',owner);assert.equal(await value('select count(*)::int from storage.objects'),1);
 await role('authenticated',other);assert.equal(await value('select count(*)::int from storage.objects'),0);
 await role('anon','');await assert.rejects(value('select get_journey()'),/permission denied/);
 await role('service_role');await assert.rejects(query('update journey_ledger set reserve_delta=99'),/permission denied/);
 await role('authenticated',owner);await value('select delete_review($1,true)',[id(888)]);assert.equal(await value('select count(*)::int from storage.objects'),0);
});
