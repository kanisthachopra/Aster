import {test,expect,type Page} from '@playwright/test';
import type {Finding} from '../src/analysis/types';
async function show(page:Page,findings:Finding[]){
 const entry={id:'journal-label-fixture',day:'2026-10-10',exercise:'pushup',file:null,report:{id:'journal-label-fixture',exercise:'pushup',status:'partial',duration:8,width:640,height:640,sampledFrames:32,usableFrames:3,coverage:.1,frames:[],findings,summary:'Limited review',limitations:[],sources:[],estimatedRepetitions:0}};
 await page.addInitScript(value=>{(window as any).journalTestEntry=value;},entry);
 await page.goto('/tests/harnesses/journal.html');await page.locator('.journal-entry > summary').click();
}
test('practice, recording and health notes do not pretend to be measured at zero seconds',async({page})=>{
 await show(page,['practice-pushup','capture','comfort-first'].map(id=>({id,title:'Next step',timestamp:0,observation:'General guidance, not a measured fault.',suggestion:'An explanation.'})));
 await expect(page.locator('.journal-finding strong')).toHaveText(['Guidance · Next step','Guidance · Next step','Guidance · Next step']);
});
test('a genuinely measured moment at the start keeps its actual timestamp',async({page})=>{
 await show(page,[{id:'pushup-timing',title:'Move together',timestamp:0,observation:'Measured movement in this interval.',suggestion:'Try moving together.'}]);
 await expect(page.locator('.journal-finding strong')).toHaveText('0.0s · Move together');
});
