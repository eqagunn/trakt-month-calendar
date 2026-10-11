const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
test('Chromium: native hydration, stable hover, route loading and restoration', {timeout:90000},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  let fixture=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8');
  fixture=fixture.replace('anchor.append(card)',`const footer=document.createElement('div');footer.className='trakt-card-footer';const info=document.createElement('div');info.className='trakt-card-footer-information';info.append(card.querySelector('.trakt-card-title').closest('a'),card.querySelector('.trakt-card-subtitle'));footer.append(info);card.append(footer);const shell=document.createElement('div');shell.className='trakt-card';const content=document.createElement('div');content.className='trakt-card-content';const pending=Array.from(card.childNodes);shell.append(content);card.replaceChildren(shell);window.nativeCards??=[];window.nativeCards.push(card);const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;content.append(...pending);content.classList.add('is-visible');observer.disconnect()},{threshold:.1});observer.observe(shell);card.addEventListener('native-probe',()=>window.nativeProbeClicks=(window.nativeProbeClicks||0)+1);anchor.append(card)`);
  fixture=fixture.replace('const footer=document.createElement',"card.querySelector('img').closest('a').classList.add('trakt-card-cover');const footer=document.createElement");
  fixture=fixture.replace('footer.append(info);',"const more=document.createElement('button');more.className='trakt-popup-menu-button';more.textContent='…';more.setAttribute('aria-label','Episode menu');window.fixture.attachPopup(more);footer.append(info,more);");
  fixture=fixture.replace('</style>',`.trakt-card{display:block;width:240px;min-height:220px}.trakt-card-content{opacity:0;transition:opacity .15s}.trakt-card-content.is-visible{opacity:1}.trakt-card-content img{width:100%;height:auto;display:block}.trakt-card-cover{display:block;outline:1px solid transparent;outline-offset:-1px;transition:outline-color .15s}.trakt-card-content:hover .trakt-card-cover{outline-color:rgb(150,90,220)}:root{--height-card-footer:40px}.trakt-card-footer{height:40px;box-sizing:border-box;padding:10px 0 0;display:flex;align-items:center}.trakt-card-title,.trakt-card-subtitle{margin:0}.trakt-card-subtitle{line-height:16px}</style>`);
  fixture=fixture.replace('</style>',fs.readFileSync(path.join(root,'content.css'),'utf8')+'</style>');
  await page.route('https://app.trakt.tv/**',route=>route.request().url().includes('/test-images/')?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#465a76"/></svg>'}):route.fulfill({contentType:'text/html',body:fixture}));
  await page.addInitScript({content:"const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,10,12]))}static now(){return RealDate.now()}};"});
  await page.goto('https://app.trakt.tv/calendar');
  for(const file of ['calendar-core.js','calendar-jump.js','content.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.waitForFunction(()=>document.querySelector('#trakt-month-calendar > .tmc-native-card img')?.naturalWidth>0);
  const first=page.locator('#trakt-month-calendar > .tmc-native-card').first();
  await first.locator('.trakt-card-cover').hover();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#trakt-month-calendar > .tmc-native-card .trakt-card-cover')).outlineColor==='rgb(150, 90, 220)');
  await first.evaluate(wrapper=>{
   window.savedNativeSlot=wrapper.assignedSlot;window.savedNativeDay=wrapper.assignedSlot.closest('.day');
   window.borderDrops=0;window.recordBorder=true;
   const sample=()=>{if(!window.recordBorder)return;if(getComputedStyle(wrapper.querySelector('.trakt-card-cover')).outlineColor!=='rgb(150, 90, 220)')window.borderDrops++;requestAnimationFrame(sample)};
   sample();
  });
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.state==='ready');
  // Trigger additional native updates while the pointer stays on the image.
  await first.evaluate(async wrapper=>{for(let i=0;i<4;i++){wrapper.querySelector('trakt-calendar-item').setAttribute('data-watched',String(i%2===0));await new Promise(r=>setTimeout(r,180))}window.recordBorder=false});
  assert.equal(await page.evaluate(()=>window.borderDrops),0,'A native hovered border must remain colored during loading and updates');
  assert(await first.evaluate(wrapper=>wrapper.assignedSlot===window.savedNativeSlot && wrapper.assignedSlot.closest('.day')===window.savedNativeDay));
  const result=await first.evaluate(wrapper=>{
   const card=wrapper.querySelector('trakt-calendar-item');window.savedNativeCard=card;window.savedNativeImage=card.querySelector('img');
   card.dispatchEvent(new Event('native-probe'));const rect=card.querySelector('.trakt-card').getBoundingClientRect();
   return{same:window.nativeCards.includes(card),width:rect.width,visible:card.querySelector('.is-visible')!==null,top:rect.top,footerHeight:card.querySelector('.trakt-card-footer').getBoundingClientRect().height,showHref:card.querySelector('.trakt-card-title').closest('a').href};
  });
  assert(result.same && result.visible);assert(result.width>50 && result.width<220);
  assert.equal(result.footerHeight,40);assert.equal(new URL(result.showHref).searchParams.get('view'),'glance');
  assert.equal(await page.locator('.watched-toggle').count(),0);
  assert.equal(await page.evaluate(()=>window.nativeProbeClicks),1);
  assert.equal(await page.evaluate(()=>document.getElementById('trakt-month-calendar').shadowRoot.querySelectorAll('.release img').length),0);
  await page.evaluate(()=>{const trigger=document.createElement('button');trigger.id='navbar-ellipsis';trigger.className='trakt-popup-menu-button';trigger.textContent='…';document.querySelector('header').append(trigger);fixture.attachPopup(trigger);window.requestsBeforeMenus=[fixture.weekRequests,fixture.scrollRequests]});
  for(const trigger of [first.locator('.trakt-popup-menu-button'),page.locator('#navbar-ellipsis')]){
   for(const close of ['clone','underlay','escape']){
    await trigger.click();
    await page.locator('[data-popup-clone]').waitFor();
    if(close==='clone')await page.locator('[data-popup-clone]').click();
    else if(close==='underlay')await page.locator('#trakt-portal-underlay').click({position:{x:5,y:5}});
    else await page.keyboard.press('Escape');
    await page.locator('.trakt-popup-menu-container').waitFor({state:'detached'});
    assert(await first.evaluate(wrapper=>wrapper.querySelector('img')===window.savedNativeImage && wrapper.assignedSlot===window.savedNativeSlot));
   }
  }
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-state'),'ready');
  assert.deepEqual(await page.evaluate(()=>[fixture.weekRequests,fixture.scrollRequests]),await page.evaluate(()=>window.requestsBeforeMenus));
  assert(await first.evaluate(wrapper=>wrapper.querySelector('trakt-calendar-item')===window.savedNativeCard && wrapper.assignedSlot===window.savedNativeSlot));
  await page.locator('#trakt-month-controls .reset-month').click();
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar').dataset.centeredWeek==='2026-10-05');
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(root,'..','native-month-v0943.png')});
  await page.locator('#trakt-month-controls .view-button').click();
  assert(await page.evaluate(()=>window.savedNativeCard.closest('.trakt-calendar-layout')!==null));
  assert(await page.evaluate(()=>window.savedNativeCard.querySelector('img')===window.savedNativeImage));
  assert.equal(await page.locator('.tmc-native-card-space').count(),0);
  assert.equal(await page.locator('.tmc-native-details').count(),0);
  assert.equal(await page.evaluate(()=>window.savedNativeCard.querySelector('.trakt-card-footer').getBoundingClientRect().height),result.footerHeight);
  assert.equal(await page.evaluate(()=>new URL(window.savedNativeCard.querySelector('.trakt-card-title').closest('a').href).pathname),'/shows/Harbour');
  await page.locator('.trakt-calendar-layout .trakt-popup-menu-button').first().click();
  await page.locator('[data-popup-clone]').click();
  await page.locator('#trakt-month-return .view-button').click();
  assert.equal(await page.locator('#trakt-month-calendar').getAttribute('data-state'),'ready','Menu dismissal must preserve Original View reuse');
  await page.evaluate(()=>{window.legacyFrames=0;const shadow=document.getElementById('trakt-month-calendar').shadowRoot;new MutationObserver(()=>{if(shadow.querySelector('.release-link'))window.legacyFrames++}).observe(shadow,{childList:true,subtree:true})});
  assert.equal(await page.locator('#trakt-month-calendar .release-link').count(),0);
  await page.waitForFunction(()=>document.getElementById('trakt-month-calendar').dataset.state==='ready');
  assert.equal(await page.evaluate(()=>window.legacyFrames),0);
  for(const path of ['/discover/releases','/calendar']){
   await page.evaluate(path=>fixture.routeTo(path,{commitDelay:750,cardDelay:1100}),path);
   await page.waitForFunction(()=>document.getElementById('trakt-month-calendar')?.dataset.state==='ready');
   const dates=await page.locator('#trakt-month-calendar > .tmc-native-card').evaluateAll(cards=>cards.map(n=>n.dataset.date));
   assert.equal(dates.length,path==='/discover/releases'?31:11);
   if(path==='/discover/releases')for(let day=1;day<=31;day++)assert(dates.includes('2026-10-'+String(day).padStart(2,'0')));
   assert.equal(await page.locator('#trakt-month-calendar .release-link,#trakt-month-calendar .release-body').count(),0);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
