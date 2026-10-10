-- Credits are half-credit integer units. Reports remain client-derived observations,
-- not a server attestation that a person exercised or used correct technique.
create schema if not exists aster_private;
revoke all on schema aster_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  authorized_id text not null unique check (authorized_id = lower(trim(authorized_id)) and authorized_id ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  callsign text not null check (char_length(trim(callsign)) between 1 and 60),
  timezone text not null default 'UTC',
  onboarding_complete boolean not null default false,
  recovery_email text,
  recovery_email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (recovery_email_verified_at is null or recovery_email is not null)
);
create table public.reviews (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  exercise text not null check (exercise in ('pullup','pushup','squat')),
  status text not null check (status in ('usable','partial')),
  report jsonb not null check (jsonb_typeof(report)='object'),
  media_path text unique,
  filename text,
  mimetype text,
  created_at timestamptz not null default now()
);
create index reviews_owner_day on public.reviews(owner_id, day desc, created_at desc);
create table public.energy_state (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  week date not null,
  regular_units integer not null default 0 check (regular_units between 0 and 40),
  reserve_units integer not null default 0 check (reserve_units between 0 and 200)
);
create table public.journey_ledger (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('activity','protection','rollover')),
  day date not null,
  charged_week date not null,
  review_id uuid,
  regular_delta integer not null,
  reserve_delta integer not null,
  created_at timestamptz not null default now(),
  unique(owner_id,kind,day)
);
create index journey_ledger_owner_day on public.journey_ledger(owner_id,day);
-- Minimal immutable receipts survive review deletion, preventing ID replay.
create table aster_private.review_receipts (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key(owner_id,review_id)
);
create table public.media_uploads (
  path text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null,
  expected_bytes bigint not null check (expected_bytes between 1 and 157286400),
  mimetype text not null check (mimetype in ('video/mp4','video/webm','video/quicktime','video/x-matroska','video/x-msvideo')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (path ~ ('^' || owner_id::text || '/' || review_id::text || '/[a-zA-Z0-9_.-]+$'))
);
create table public.media_deletion_queue (
  path text primary key,
  owner_id uuid not null,
  queued_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.recovery_credentials (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  salt text not null check (char_length(salt) between 16 and 512),
  secret_hash text not null check (char_length(secret_hash) between 32 and 1024),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table public.recovery_email_codes (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null check (purpose in ('verify','recover')),
  email text not null,
  salt text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  primary key(owner_id,purpose)
);
create table aster_private.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  window_seconds integer not null,
  used bigint not null
);
-- Server checks this nonce digest as well as the Auth token. Deletion revokes
-- application access immediately even while an old Auth JWT remains unexpired.
create table public.app_sessions (
  id_hash text primary key check (id_hash ~ '^[0-9a-f]{64}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now()+interval '30 days')
);
create index app_sessions_owner on public.app_sessions(owner_id);

alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.energy_state enable row level security;
alter table public.journey_ledger enable row level security;
alter table public.media_uploads enable row level security;
alter table public.media_deletion_queue enable row level security;
alter table public.recovery_credentials enable row level security;
alter table public.recovery_email_codes enable row level security;
alter table public.app_sessions enable row level security;
revoke all on public.app_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.app_sessions to service_role;
create policy profiles_owner_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy reviews_owner_read on public.reviews for select to authenticated using (owner_id=(select auth.uid()));
create policy energy_owner_read on public.energy_state for select to authenticated using (owner_id=(select auth.uid()));
create policy ledger_owner_read on public.journey_ledger for select to authenticated using (owner_id=(select auth.uid()));
revoke all on public.profiles,public.reviews,public.energy_state,public.journey_ledger,public.media_uploads,public.media_deletion_queue,public.recovery_credentials,public.recovery_email_codes from anon,authenticated;
grant select on public.profiles,public.reviews,public.energy_state,public.journey_ledger to authenticated;
grant all on public.profiles,public.reviews,public.energy_state,public.journey_ledger,public.media_uploads,public.media_deletion_queue,public.recovery_credentials,public.recovery_email_codes to service_role;
revoke update,delete,truncate on public.journey_ledger from service_role;
grant usage,select on sequence public.journey_ledger_id_seq to service_role;

create function aster_private.profile_guard() returns trigger language plpgsql set search_path='' as $$
begin
  new.authorized_id := lower(trim(new.authorized_id));
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone' using errcode='22023'; end if;
  if tg_op='UPDATE' and new.timezone<>old.timezone and exists(select 1 from public.journey_ledger where owner_id=new.id) then
    raise exception 'Timezone changes after progress require a calendar migration' using errcode='22023';
  end if;
  return new;
end $$;
create trigger profile_guard before insert or update on public.profiles for each row execute function aster_private.profile_guard();

create function aster_private.week_start(p_day date) returns date language sql immutable set search_path='' as $$
 select p_day - (extract(isodow from p_day)::integer-1)
$$;
create function aster_private.owner_day(p_owner uuid) returns date language plpgsql stable security definer set search_path='' as $$
declare tz text;
begin
 select timezone into tz from public.profiles where id=p_owner;
 if tz is null then raise exception 'Profile missing' using errcode='P0002'; end if;
 return (statement_timestamp() at time zone tz)::date;
end $$;
-- Every progression mutation locks the same per-account row before reading awards.
create function aster_private.settle(p_owner uuid,p_today date) returns void language plpgsql security definer set search_path='' as $$
declare s public.energy_state%rowtype; new_week date:=aster_private.week_start(p_today); bonus integer:=0;
begin
 insert into public.energy_state(owner_id,week) values(p_owner,new_week) on conflict(owner_id) do nothing;
 select * into s from public.energy_state where owner_id=p_owner for update;
 if new_week>s.week then
   if (select count(*) from public.journey_ledger where owner_id=p_owner and kind='activity' and day>=s.week and day<s.week+7)=7
      and not exists(select 1 from public.journey_ledger where owner_id=p_owner and kind='protection' and (charged_week=s.week or (day>=s.week and day<s.week+7))) then
     bonus:=least(5,200-s.reserve_units);
   end if;
   insert into public.journey_ledger(owner_id,kind,day,charged_week,regular_delta,reserve_delta)
     values(p_owner,'rollover',s.week,s.week,-s.regular_units,bonus);
   update public.energy_state set week=new_week,regular_units=0,reserve_units=reserve_units+bonus where owner_id=p_owner;
 end if;
end $$;
create function aster_private.journey_json(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
   'entries',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'day',r.day,'exercise',r.exercise,'report',r.report,'media_path',r.media_path,'filename',r.filename,'mimetype',r.mimetype) order by r.created_at) from public.reviews r where r.owner_id=p_owner),'[]'::jsonb),
   'activity',coalesce((select jsonb_agg(day order by day) from public.journey_ledger where owner_id=p_owner and kind='activity'),'[]'::jsonb),
   'protected',coalesce((select jsonb_agg(day order by day) from public.journey_ledger where owner_id=p_owner and kind='protection'),'[]'::jsonb),
   'regular',s.regular_units/2.0,'reserve',s.reserve_units/2.0,'week',s.week
 ) from public.energy_state s where s.owner_id=p_owner
$$;

create function public.get_journey() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d date;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 d:=aster_private.owner_day(u); perform aster_private.settle(u,d);
 return aster_private.journey_json(u);
end $$;

create function public.complete_review(p_report jsonb,p_media_path text default null,p_filename text default null,p_mimetype text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d date; rid uuid; ex text; st text; n integer; award integer; intent public.media_uploads%rowtype;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_report)<>'object' or octet_length(p_report::text)>4000000 then raise exception 'Invalid or oversized report' using errcode='22023'; end if;
 rid:=(p_report->>'id')::uuid; ex:=p_report->>'exercise'; st:=p_report->>'status';
 if rid is null or ex is null or ex not in ('pullup','pushup','squat') or st is null or st not in ('usable','partial') then raise exception 'Review not eligible' using errcode='22023'; end if;
 d:=aster_private.owner_day(u); perform aster_private.settle(u,d);
 if exists(select 1 from aster_private.review_receipts where owner_id=u and review_id=rid) then return aster_private.journey_json(u); end if;
 if exists(select 1 from public.reviews where id=rid and owner_id<>u) then raise exception 'Review ID unavailable' using errcode='23505'; end if;
 if p_media_path is not null then
   select * into intent from public.media_uploads where path=p_media_path and owner_id=u and review_id=rid for update;
   if not found or intent.expires_at<statement_timestamp() or intent.verified_at is null or intent.consumed_at is not null or intent.mimetype is distinct from p_mimetype then raise exception 'Recording upload is not verified' using errcode='22023'; end if;
   update public.media_uploads set consumed_at=now() where path=p_media_path;
 end if;
 if char_length(coalesce(p_filename,''))>255 then raise exception 'Filename too long' using errcode='22023'; end if;
 insert into public.reviews(id,owner_id,day,exercise,status,report,media_path,filename,mimetype)
 values(rid,u,d,ex,st,p_report,p_media_path,case when p_media_path is not null then p_filename end,case when p_media_path is not null then p_mimetype end);
 insert into aster_private.review_receipts(owner_id,review_id) values(u,rid);
 if st='usable' and not exists(select 1 from public.journey_ledger where owner_id=u and kind='activity' and day=d) then
   select count(*) into n from public.journey_ledger where owner_id=u and kind='activity' and day>=aster_private.week_start(d) and day<aster_private.week_start(d)+7;
   award:=case when n<3 then 10 when n<5 then 5 else 0 end;
   insert into public.journey_ledger(owner_id,kind,day,charged_week,review_id,regular_delta,reserve_delta) values(u,'activity',d,aster_private.week_start(d),rid,award,0);
   update public.energy_state set regular_units=regular_units+award where owner_id=u;
 end if;
 return aster_private.journey_json(u);
end $$;

create function public.protect_day(p_day date,p_allow_reserve boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d date; s public.energy_state%rowtype; reg integer; joined date;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 d:=aster_private.owner_day(u); perform aster_private.settle(u,d);
 select (created_at at time zone timezone)::date into joined from public.profiles where id=u;
 if p_day is null or p_day>=d or p_day<joined then raise exception 'Choose an earlier missed account day' using errcode='22023'; end if;
 if exists(select 1 from public.journey_ledger where owner_id=u and day=p_day and kind='protection') then return aster_private.journey_json(u); end if;
 if exists(select 1 from public.journey_ledger where owner_id=u and day=p_day and kind='activity') then raise exception 'Activity day cannot be protected' using errcode='22023'; end if;
 if (select count(*) from public.journey_ledger where owner_id=u and kind='protection' and day>=aster_private.week_start(p_day) and day<aster_private.week_start(p_day)+7)>=3 then raise exception 'Weekly protection limit reached' using errcode='22023'; end if;
 select * into s from public.energy_state where owner_id=u;
 reg:=least(20,s.regular_units);
 if s.regular_units+s.reserve_units<20 then raise exception 'Not enough energy credits' using errcode='22023'; end if;
 if reg<20 and not coalesce(p_allow_reserve,false) then raise exception 'Confirm spending reserve credits' using errcode='22023'; end if;
 update public.energy_state set regular_units=regular_units-reg,reserve_units=reserve_units-(20-reg) where owner_id=u;
 insert into public.journey_ledger(owner_id,kind,day,charged_week,regular_delta,reserve_delta) values(u,'protection',p_day,s.week,-reg,-(20-reg));
 return aster_private.journey_json(u);
end $$;

create function public.delete_review(p_review_id uuid,p_media_only boolean default false) returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.reviews%rowtype;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 -- Same lock order as completion; deletion does not refund or remove participation.
 perform aster_private.settle(u,aster_private.owner_day(u));
 select * into r from public.reviews where id=p_review_id and owner_id=u for update;
 if not found then return null; end if;
 if r.media_path is not null then
   insert into public.media_deletion_queue(path,owner_id) values(r.media_path,u) on conflict(path) do nothing;
   delete from public.media_uploads where path=r.media_path and owner_id=u;
 end if;
 if p_media_only then
   update public.reviews set media_path=null,filename=null,mimetype=null,
     report=(report-'trackedFrames'-'rawLandmarks'-'landmarks') || jsonb_build_object('frames','[]'::jsonb,'sourceMediaDeleted',true)
     where id=p_review_id and owner_id=u;
 else delete from public.reviews where id=p_review_id and owner_id=u;
 end if;
 return r.media_path;
end $$;

-- A fixed-window limiter, serialized by key. Use stable hashed account/IP/global
-- keys; keep limits and windows server-controlled, never from request parameters.
create function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer,p_cost integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r aster_private.rate_limits%rowtype; t timestamptz:=clock_timestamp(); wait integer;
begin
 if p_key is null or p_limit is null or p_window_seconds is null or p_cost is null or char_length(p_key) not between 1 and 256 or p_limit<1 or p_window_seconds not between 1 and 604800 or p_cost<1 then raise exception 'Invalid limiter arguments' using errcode='22023'; end if;
 insert into aster_private.rate_limits(key,window_started_at,window_seconds,used) values(p_key,t,p_window_seconds,0) on conflict(key) do nothing;
 select * into r from aster_private.rate_limits where key=p_key for update;
 if r.window_seconds<>p_window_seconds then raise exception 'Limiter window changed for existing key' using errcode='22023'; end if;
 if t>=r.window_started_at+make_interval(secs=>p_window_seconds) then
   r.window_started_at:=t; r.used:=0;
   update aster_private.rate_limits set window_started_at=t,used=0 where key=p_key;
 end if;
 if r.used+p_cost>p_limit then
   wait:=greatest(1,ceil(extract(epoch from r.window_started_at+make_interval(secs=>p_window_seconds)-t))::integer);
   return jsonb_build_object('allowed',false,'retry_after',wait,'remaining',greatest(0,p_limit-r.used));
 end if;
 update aster_private.rate_limits set used=used+p_cost where key=p_key;
 return jsonb_build_object('allowed',true,'retry_after',0,'remaining',p_limit-r.used-p_cost);
end $$;

-- Server verifies the supplied command with scrypt+pepper before this CAS.
-- Only one concurrent recovery can rotate a particular credential version.
create function public.rotate_recovery(p_owner_id uuid,p_expected_version bigint,p_expected_hash text,p_new_salt text,p_new_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 update public.recovery_credentials set salt=p_new_salt,secret_hash=p_new_hash,version=version+1,updated_at=now()
 where owner_id=p_owner_id and version=p_expected_version and secret_hash=p_expected_hash;
 get diagnostics n=row_count; return n=1;
end $$;

-- Email code verification is performed server-side. Delete-and-return is one
-- atomic claim; persistent owner/IP rate limits bound wrong-code attempts.
create function public.consume_email_code(p_owner_id uuid,p_purpose text,p_expected_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 delete from public.recovery_email_codes where owner_id=p_owner_id and purpose=p_purpose and code_hash=p_expected_hash and expires_at>statement_timestamp() and attempts<5;
 get diagnostics n=row_count; return n=1;
end $$;

revoke execute on all functions in schema aster_private from public,anon,authenticated;
revoke execute on function public.get_journey(),public.complete_review(jsonb,text,text,text),public.protect_day(date,boolean),public.delete_review(uuid,boolean),public.consume_rate_limit(text,integer,integer,integer),public.rotate_recovery(uuid,bigint,text,text,text),public.consume_email_code(uuid,text,text) from public,anon,authenticated;
grant execute on function public.get_journey(),public.complete_review(jsonb,text,text,text),public.protect_day(date,boolean),public.delete_review(uuid,boolean) to authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer,integer),public.rotate_recovery(uuid,bigint,text,text,text),public.consume_email_code(uuid,text,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('aster-recordings','aster-recordings',false,157286400,array['video/mp4','video/webm','video/quicktime','video/x-matroska','video/x-msvideo'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Browser clients do not mutate storage directly. Server-issued signed uploads
-- are constrained by a DB intent; size/type are checked before verified_at is set.
create policy aster_recordings_read on storage.objects for select to authenticated using (
 bucket_id='aster-recordings' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.reviews r where r.owner_id=(select auth.uid()) and r.media_path=name)
);
