const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engines=require('playwright');
const engine=process.env.TEST_BROWSER||'chromium',root=path.resolve(__dirname,'..');
test(engine+': popup preferences persist and control both open calendar sections',{timeout:120000},async()=>{
 const trace=text=>{if(process.env.TEST_DEBUG)console.log(text)};
 const options={headless:process.env.TEST_HEADED!=='1',executablePath:process.env['TEST_'+engine.toUpperCase()+'_PATH'],args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]};
 if(engine==='firefox' && process.env.TEST_DISABLE_SANDBOX==='1')options.firefoxUserPrefs={'security.sandbox.content.level':0,'security.sandbox.rdd.level':0,'security.sandbox.gpu.level':0};
 const browser=await engines[engine].launch(options),context=await browser.newContext({viewport:{width:1440,height:1050}}),stored={},errors=[];
 try{
  await context.exposeBinding('testReadPreferences',()=>({...stored}));
  await context.exposeBinding('testWritePreferences',async(_,values)=>{
   const changes={};for(const [key,newValue] of Object.entries(values)){changes[key]={oldValue:stored[key],newValue};stored[key]=newValue}
   for(const page of context.pages())await page.evaluate(changes=>window.testPreferenceChanged?.(changes),changes);
  });
  await context.addInitScript(()=>{
   const listeners=new Set();window.testPreferenceChanged=changes=>{for(const listener of listeners)listener(changes,'local')};
   window.chrome={storage:{local:{get:()=>window.testReadPreferences(),set:values=>window.testWritePreferences(values)},onChanged:{addListener:f=>listeners.add(f),removeListener:f=>listeners.delete(f)}}};
   const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,10,12]))}static now(){return RealDate.now()}};
  });
  await context.route('https://extension.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1),allowed=['popup.html','popup.js','popup.css','preferences.js','icons/icon-128.png'];
   if(!allowed.includes(name))return route.abort();
   return route.fulfill({contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html',body:fs.readFileSync(path.join(root,name))});
  });
  const fixture=fs.readFileSync(path.join(root,'tests/fixture.html'),'utf8').replace('</style>',fs.readFileSync(path.join(root,'content.css'),'utf8')+'</style>');
  await context.route('https://app.trakt.tv/**',route=>route.fulfill({contentType:route.request().url().includes('/test-images/')?'image/svg+xml':'text/html',body:route.request().url().includes('/test-images/')?'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/>':fixture}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://app.trakt.tv/calendar');
  for(const file of ['preferences.js','calendar-core.js','calendar-jump.js','content.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.state==='ready');
  trace('Calendar ready');
  assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-centered-week'),'2026-10-05');
  const popup=await context.newPage();popup.on('pageerror',e=>errors.push(e.message));await popup.goto('https://extension.test/popup.html');
  await popup.waitForFunction(()=>document.querySelectorAll('input:checked[value="auto"]').length===4);
  trace('Popup ready');
  const choose=async(key,value)=>{trace(key+' '+value);await popup.locator('label').filter({has:popup.locator('input[name="'+key+'"][value="'+value+'"]')}).click();await popup.waitForFunction(()=>document.getElementById('status').textContent==='Saved.');assert.equal(stored[key],value==='auto')};
  await choose('calendarWeekAuto','manual');await choose('calendarMonthAuto','manual');
  await page.locator('#trakt-month-return').waitFor();assert.equal(await page.locator('#trakt-month-calendar').count(),0);
  await choose('calendarMonthAuto','auto');await page.locator('#trakt-month-calendar').waitFor();
  assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-centered-week'),null);
  await page.locator('#trakt-month-controls .reset-month').click();await page.waitForFunction(()=>document.getElementById('trakt-month-calendar').dataset.centeredWeek==='2026-10-05');
  await choose('releasesMonthAuto','manual');assert.equal(await page.locator('#trakt-month-calendar').count(),1);
  await page.evaluate(()=>fixture.routeTo('/discover/releases'));
  await page.locator('#trakt-month-calendar').waitFor({state:'detached'});await page.locator('#trakt-month-return').waitFor();
  await page.locator('#trakt-month-return .view-button').click();
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.centeredWeek==='2026-10-05');
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.state==='ready');
  await choose('releasesWeekAuto','manual');await choose('calendarMonthAuto','manual');
  await popup.reload();await popup.waitForFunction(()=>document.querySelectorAll('input:checked[value="manual"]').length===4);
  await popup.setViewportSize({width:350,height:430});
  assert(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'The popup must fit without horizontal scrolling');
  await popup.screenshot({path:path.join(root,'..','settings-'+engine+'.png')});
  await popup.locator('input[name="calendarWeekAuto"][value="auto"]').focus();await popup.keyboard.press('Space');
  await popup.waitForFunction(()=>document.getElementById('status').textContent==='Saved.');assert.equal(stored.calendarWeekAuto,true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
