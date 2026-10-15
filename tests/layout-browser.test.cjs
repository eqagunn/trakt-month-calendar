const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engines=require('playwright'),engine=process.env.TEST_BROWSER||'chromium',root=path.resolve(__dirname,'..');
test(engine+': Releases waits for late cards above the current week',{timeout:90000},async()=>{
 const options={headless:process.env.TEST_HEADED!=='1',executablePath:process.env['TEST_'+engine.toUpperCase()+'_PATH'],args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]};
 if(engine==='firefox' && process.env.TEST_DISABLE_SANDBOX==='1')options.firefoxUserPrefs={'security.sandbox.content.level':0,'security.sandbox.rdd.level':0,'security.sandbox.gpu.level':0};
 const browser=await engines[engine].launch(options),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  let fixture=fs.readFileSync(path.join(root,'tests/fixture.html'),'utf8').replace('</style>',fs.readFileSync(path.join(root,'content.css'),'utf8')+'</style>');
  fixture=fixture.replace("document.getElementById('periods').append(period);count++","if(week.getMonth()===8){period.setAttribute('aria-busy','true');window.fixture.pendingEarlier=period}document.getElementById('periods').append(period);count++");
  await page.route('https://app.trakt.tv/**',route=>route.fulfill({contentType:route.request().url().includes('/test-images/')?'image/svg+xml':'text/html',body:route.request().url().includes('/test-images/')?'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/>':fixture}));
  await page.addInitScript(()=>{const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,10,12]))}static now(){return RealDate.now()}}});
  await page.goto('https://app.trakt.tv/discover/releases');
  for(const file of ['preferences.js','calendar-core.js','calendar-jump.js','content.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.locator('#trakt-month-calendar > .tmc-native-card[data-date="2026-10-11"]').waitFor();
  await page.evaluate(()=>{fixture.stuck=true});
  await page.waitForTimeout(900);
  assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-centered-week'),null,'Keep the current week pending while the preceding period is busy');
  await page.evaluate(()=>{
   const host=document.getElementById('trakt-month-calendar'),anchor=fixture.pendingEarlier.querySelector('#day-2026-10-1'),card=host.querySelector('.tmc-native-card[data-date="2026-10-01"] trakt-calendar-item');
   for(let i=0;i<4;i++)anchor.append(card.cloneNode(true));
   fixture.pendingEarlier.setAttribute('aria-busy','false');
  });
  await page.waitForTimeout(300);assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-centered-week'),null,'New cards must settle before jumping');
  await page.waitForFunction(()=>{const h=document.getElementById('trakt-month-calendar'),s=h.shadowRoot,v=s.querySelector('#tmc-month-viewport'),week=s.querySelector('[data-date="2026-10-05"]');return h.dataset.centeredWeek==='2026-10-05' && Math.abs(week.getBoundingClientRect().top-v.getBoundingClientRect().top-parseFloat(s.querySelector('.shell').style.paddingTop))<2});
  assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-state'),'loading','The remaining month must not block the jump');
  assert.equal(await page.locator('#trakt-month-calendar > .tmc-native-card[data-date="2026-10-01"]').count(),5);
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
test(engine+': dense Releases aligns a short final week and reuses remounted loaded periods',{timeout:120000},async()=>{
 const options={headless:true,executablePath:process.env['TEST_'+engine.toUpperCase()+'_PATH'],args:engine==='chromium'?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]};
 if(engine==='firefox' && process.env.TEST_DISABLE_SANDBOX==='1')options.firefoxUserPrefs={'security.sandbox.content.level':0,'security.sandbox.rdd.level':0,'security.sandbox.gpu.level':0};
 const browser=await engines[engine].launch(options),page=await browser.newPage({viewport:{width:1440,height:1050}});
 try{
  let fixture=fs.readFileSync(path.join(root,'tests/fixture.html'),'utf8').replace('</style>',fs.readFileSync(path.join(root,'content.css'),'utf8')+'</style>');
  fixture=fixture.replace('anchor.append(card);period.append(anchor)',"anchor.append(card);if(week.getMonth()===8 || week.getDate()<26)for(let i=0;i<7;i++)anchor.append(card.cloneNode(true));period.append(anchor)");
  await page.route('https://app.trakt.tv/**',route=>route.fulfill({contentType:route.request().url().includes('/test-images/')?'image/svg+xml':'text/html',body:route.request().url().includes('/test-images/')?'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/>':fixture}));
  await page.addInitScript(()=>{const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,30,12]))}static now(){return RealDate.now()}}});
  await page.goto('https://app.trakt.tv/discover/releases');
  for(const file of ['preferences.js','calendar-core.js','calendar-jump.js','content.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.state==='ready');
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.centeredWeek==='2026-10-26');
  await page.waitForTimeout(500);
  const geometry=await page.locator('#trakt-month-calendar').evaluate(h=>{const s=h.shadowRoot,v=s.querySelector('#tmc-month-viewport'),day=s.querySelector('[data-date="2026-10-26"]'),footer=h.querySelector('.trakt-footer');return{top:day.getBoundingClientRect().top-v.getBoundingClientRect().top,start:parseFloat(s.querySelector('.shell').style.paddingTop),scroll:v.scrollTop,max:v.scrollHeight-v.clientHeight,cards:h.querySelectorAll('trakt-calendar-item').length,footerBottom:footer.getBoundingClientRect().bottom,viewportBottom:v.getBoundingClientRect().bottom}});
  assert(geometry.cards>150);assert(Math.abs(geometry.top-geometry.start)<2,JSON.stringify(geometry));
  assert(Math.abs(geometry.footerBottom-geometry.viewportBottom)<2,'Keep the native footer at the bottom of a short final week');
  await page.evaluate(()=>{
   window.anchorSamples=[];window.anchorRecording=true;
   const record=()=>{if(!window.anchorRecording)return;const s=document.getElementById('trakt-month-calendar').shadowRoot;window.anchorSamples.push(s.querySelector('[data-date="2026-10-26"]').getBoundingClientRect().top);requestAnimationFrame(record)};record();
   const card=document.querySelector('#trakt-month-calendar .tmc-native-card[data-date="2026-10-01"] trakt-calendar-item');
   for(let i=0;i<6;i++)document.getElementById('day-2026-10-1').append(card.cloneNode(true));
  });
  await page.waitForTimeout(500);
  assert(await page.evaluate(()=>{window.anchorRecording=false;return Math.max(...window.anchorSamples)-Math.min(...window.anchorSamples)<2}),'Late earlier cards must not move the aligned week between frames');
  await page.locator('#tmc-month-viewport').evaluate(v=>{v.scrollTop=0});
  await page.waitForTimeout(100);
  await page.evaluate(()=>{const card=document.querySelector('#trakt-month-calendar .tmc-native-card[data-date="2026-10-01"] trakt-calendar-item');document.getElementById('day-2026-10-1').append(card.cloneNode(true))});
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#tmc-month-viewport').evaluate(v=>v.scrollTop),0,'Manual scrollbar movement cancels the anchor');
  const requests=await page.evaluate(()=>[fixture.weekRequests,fixture.scrollRequests]);
  await page.locator('#trakt-month-controls .view-button').click();
  await page.evaluate(()=>{for(const period of document.querySelectorAll('.trakt-calendar-items'))period.replaceWith(period.cloneNode(true))});
  const restored=await page.locator('#trakt-month-return .view-button').evaluate(button=>{button.click();return document.getElementById('trakt-month-calendar')?.dataset.state});
  assert.equal(restored,'ready','A fully loaded native month must return immediately even when Trakt remounts its periods');
  assert.deepEqual(await page.evaluate(()=>[fixture.weekRequests,fixture.scrollRequests]),requests);
 }finally{await browser.close()}
});
