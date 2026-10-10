import {test,expect} from '@playwright/test';

const journey={entries:[],activity:[],protected:[],regular:0,reserve:0,week:'2026-10-05'};
const profile={id:'00000000-0000-4000-8000-000000000001',authorizedId:'visitor_test',callsign:'Mira',timezone:'Asia/Singapore',onboardingComplete:true};
test('title sign-in is available during loading and restores the journey without replaying onboarding',async({page})=>{
 test.setTimeout(120000);
 let releaseInitial!:()=>void;
 const initial=new Promise<void>(resolve=>{releaseInitial=resolve;});
 await page.route('**/api/outpost?*',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='session') { await initial; await route.fulfill({json:{configured:true,authenticated:false,emailAvailable:false}}); }
  else if(action==='login') await route.fulfill({json:{profile,journey}});
  else await route.fulfill({json:{profile,journey}});
 });
 await page.goto('/');
 await page.getByRole('button',{name:/02Sign in|02 Sign in/}).click({timeout:60000});
 await expect(page.getByRole('heading',{name:'Connecting to your account.'})).toBeVisible();
 releaseInitial();
 await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
 await page.getByLabel('Authorized ID',{exact:true}).fill('visitor_test');
 await page.getByLabel('Authorization password',{exact:true}).fill('test-only-password-123');
 await page.getByRole('button',{name:'Sign in to the outpost'}).click();
 await expect(page.getByRole('heading',{name:'There you are, traveller.'})).toBeVisible();
 await expect(page.getByText('Mira, pick something',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Close panel'}).click();
 await page.getByRole('button',{name:/Account ◈/}).click();
 await expect(page.getByRole('heading',{name:'Your account.'})).toBeVisible();
 await expect(page.getByText('Authorized ID: visitor_test')).toBeVisible();
});
