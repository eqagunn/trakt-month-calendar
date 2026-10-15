const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function context(stored={},fail={}){
 const {Window}=await import('happy-dom');
 const w=new Window({settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}}),listeners=new Set();
 const storage={local:{get:async()=>{if(fail.read)throw Error('read');return{...stored}},set:async patch=>{if(fail.write)throw Error('write');const changes={};for(const [key,newValue] of Object.entries(patch)){changes[key]={oldValue:stored[key],newValue};stored[key]=newValue}for(const f of listeners)f(changes,'local')}},onChanged:{addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f)}};
 w.browser={storage};w.eval(fs.readFileSync(path.join(root,'preferences.js'),'utf8'));
 return{w,stored,listeners,storage,async close(){await w.happyDOM.abort()}};
}
test('all four preferences default to Auto and ignore invalid stored values',async()=>{
 const e=await context({calendarMonthAuto:false,releasesWeekAuto:'manual',unknown:false});try{
  const v=await e.w.TraktMonthPreferences.load();
  assert.deepEqual(JSON.parse(JSON.stringify(v)),{calendarMonthAuto:false,calendarWeekAuto:true,releasesMonthAuto:true,releasesWeekAuto:true});
  await assert.rejects(e.w.TraktMonthPreferences.save('unknown',false));
  assert(Object.values(e.w.TraktMonthPreferences.defaults).every(Boolean));
 }finally{await e.close()}
});
test('settings changes preserve independent keys and notify only local preference changes',async()=>{
 const e=await context();try{
  let updates=[];const s=e.w.TraktMonthPreferences,stop=s.subscribe(values=>updates.push(JSON.parse(JSON.stringify(values))));
  await s.save('calendarWeekAuto',false);await s.save('releasesMonthAuto',false);
  assert.deepEqual(e.stored,{calendarWeekAuto:false,releasesMonthAuto:false});
  for(const f of e.listeners){f({unknown:{newValue:false}},'local');f({calendarWeekAuto:{newValue:true}},'sync');f({calendarWeekAuto:{oldValue:false,newValue:false}},'local')}
  assert.equal(updates.length,2);
  for(const f of e.listeners)f({calendarWeekAuto:{oldValue:false}},'local');
  assert.equal(updates[2].calendarWeekAuto,true,'Removing a preference restores Auto');
  stop();await s.save('calendarWeekAuto',true);assert.equal(updates.length,3);
 }finally{await e.close()}
});
async function popup(stored,fail){
 const e=await context(stored,fail);
 e.w.document.write(fs.readFileSync(path.join(root,'popup.html'),'utf8').replace(/<script[^>]*><\/script>/g,''));
 e.w.eval(fs.readFileSync(path.join(root,'popup.js'),'utf8'));await tick();return e;
}
test('popup saves each Auto/Manual selection and restores it on reopening',async()=>{
 const stored={};let e=await popup(stored);try{
  const d=e.w.document;assert.equal(d.querySelectorAll('input:checked[value="auto"]').length,4);
  for(const key of Object.keys(e.w.TraktMonthPreferences.defaults)){
   const input=d.querySelector('input[name="'+key+'"][value="manual"]');input.checked=true;input.dispatchEvent(new e.w.Event('change',{bubbles:true}));await tick();assert.equal(stored[key],false);
  }
  assert.equal(d.getElementById('status').textContent,'Saved.');
 }finally{await e.close()}
 e=await popup(stored);try{assert.equal(e.w.document.querySelectorAll('input:checked[value="manual"]').length,4)}finally{await e.close()}
});
test('popup shows storage failures and restores the previously saved choice',async()=>{
 const e=await popup({}, {write:true});try{
  const input=e.w.document.querySelector('input[name="calendarMonthAuto"][value="manual"]');input.checked=true;input.dispatchEvent(new e.w.Event('change',{bubbles:true}));await tick();
  assert(e.w.document.querySelector('input[name="calendarMonthAuto"][value="auto"]').checked);
  assert.match(e.w.document.getElementById('status').textContent,/Could not save/);
 }finally{await e.close()}
 const f=await popup({}, {read:true});try{assert(f.w.document.querySelector('fieldset').disabled);assert.match(f.w.document.getElementById('status').textContent,/Could not read/)}finally{await f.close()}
});
