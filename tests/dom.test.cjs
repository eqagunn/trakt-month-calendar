const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function setup(options={}){
 const {Window}=await import(process.env.TEST_HAPPY_DOM_PATH || 'happy-dom');
 const w=new Window({url:'https://app.trakt.tv'+(options.releases?'/discover/releases':'/calendar'),width:1440,height:1050,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 let fixture=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8');
 if(options.controlsGap)fixture=fixture.replace('<header style=','<header class="svelte-9b8fk1" style=').replace('class="calendar-navigation"','class="calendar-navigation svelte-y0esg"');
 if(options.nativeHeader)fixture=fixture.replace('<div class="trakt-calendar-controls">','<div class="trakt-calendar-header svelte-y0esg"><div class="calendar-header-actions svelte-lu6ljy"></div><div class="trakt-calendar-controls">').replace('</div><div class="trakt-calendar-days">','</div></div><div class="trakt-calendar-days">');
 if(options.multipleReleases)fixture=fixture.replace('anchor.append(card);period.append(anchor)',"anchor.append(card);const extra=card.cloneNode(true);for(const a of extra.querySelectorAll('a'))if(a.href.includes('/episodes/'))a.href=a.href.replace(/\\/episodes\\/([0-9]+)/,(_,n)=>'/episodes/'+(Number(n)+100));extra.querySelector('.trakt-card-title').textContent='Additional release';anchor.append(extra);period.append(anchor)");
 if(options.nativeIdentity)fixture=fixture.replace('anchor.append(card)',"window.nativeImages??=[];window.nativeImages.push(card.querySelector('img'));card.addEventListener('native-probe',()=>window.nativeProbeClicks=(window.nativeProbeClicks||0)+1);anchor.append(card)");
 if(options.nativePopupIcons)fixture=fixture.replace('anchor.append(card);period.append(anchor)',`const more=document.createElement('button');more.className='trakt-popup-menu-button';more.setAttribute('data-variant','portal');more.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>';window.fixture.attachPopup(more);card.append(more);anchor.append(card);period.append(anchor)`);
 if(options.nativeDateNavigation)fixture=fixture.replace('first=add(first,-7);reset()', 'const d=new Date(first);d.setHours(0,0,0,0);d.setDate(d.getDate()-7);first=d;reset()');
 if(options.fullSeason)fixture=fixture.replace("'S01E'+String(d.getDate()).padStart(2,'0')+' – Homecoming'","'Season 2'");
 if(options.bulletSubtitle)fixture=fixture.replace("'S01E'+","'S01 • E'+");
 if(options.drawerLinks)fixture=fixture.replace("'/seasons/1/episodes/'+d.getDate()","'?view=episode&season=1&episode='+d.getDate()");
 if(options.preloadedMonth)fixture=fixture.replace('toolbar();appendWeek();window.scrollTo(0,0)','toolbar();for(let i=0;i<5;i++)appendWeek();window.scrollTo(0,0)');
 if(options.delayedStartup)fixture=fixture.replace('reset();\n</script>','setTimeout(reset,1200);\n</script>');
 if(options.viewportCards){
  fixture=fixture.replace('for(const offset of (releases?[0,1,2,3,4,5,6]:[1,3,5]))','for(const offset of [1,3,4,5])');
  fixture=fixture.replace('anchor.append(card)',"const shell=document.createElement('div');shell.className='trakt-card';const content=document.createElement('div');content.className='trakt-card-content';content._pending=Array.from(card.childNodes);for(const node of content._pending)node.remove();shell.append(content);card.append(shell);anchor.append(card)");
  w.HTMLElement.prototype.scrollIntoView=function(){const content=this.querySelector('.trakt-card-content');if(content&&!content.classList.contains('is-visible')){content.append(...content._pending);content.classList.add('is-visible');w.revealedCards=(w.revealedCards||0)+1}};
 }
 if(options.delayedEarlierCards)fixture=fixture.replace("document.getElementById('periods').append(period);count++","if(week.getMonth()===8){const late=Array.from(period.children).slice(1);for(const node of late)node.remove();setTimeout(()=>period.append(...late),1100)}document.getElementById('periods').append(period);count++");
 if(options.busyEarlierPeriod)fixture=fixture.replace("document.getElementById('periods').append(period);count++","if(week.getMonth()===8){period.setAttribute('aria-busy','true');window.fixture.pendingEarlier=period}document.getElementById('periods').append(period);count++");
 if(options.blockScroll)fixture=fixture.replace('loading||stuck','loading||stuck||true');
 if(options.emptyCalendar)fixture=fixture.replace('const empty=!releases&&week.getMonth()===9&&week.getDate()===12','const empty=true');
 if(options.emptyLimit)fixture=fixture.replace('count>=10','count>=5');
 w.document.write(fixture.replace('</style>',fs.readFileSync(path.join(root,'content.css'),'utf8')+'</style>').replace(/<script>[\s\S]*?<\/script>/g,''));
 if(options.controlledResize){
  w.resizeCallbacks=[];
  w.ResizeObserver=class{constructor(callback){this.callback=callback}observe(node){w.resizeCallbacks.push({node,callback:this.callback})}disconnect(){}};
 }
 let scroll=0;
 w.HTMLElement.prototype.scrollTo=function(x,y){this.scrollTop=Math.max(0,typeof x==='object'?x.top:y);w.setTimeout(()=>this.dispatchEvent(new w.Event('scroll')),0)};
 w.firstRowGrowth=0;
 Object.defineProperty(w,'scrollY',{get:()=>scroll});
 Object.defineProperty(w.document.documentElement,'scrollHeight',{get:()=>Math.max(400+w.document.querySelectorAll('.trakt-calendar-items').length*1100,w.document.getElementById('trakt-month-calendar')?.dataset.state==='ready'?1971+w.firstRowGrowth:0)});
 w.HTMLElement.prototype.getBoundingClientRect=function(){
  if(options.controlsGap && this.classList.contains('svelte-9b8fk1'))return{left:0,right:1440,top:0,bottom:64,width:1440,height:64};
  if(options.controlsGap && this.classList.contains('svelte-y0esg')){const top=128+(w.location.pathname==='/discover/releases'?(options.releasesOffset||0):0);return{left:280,right:1400,top,bottom:top+140,width:1120,height:140}};
  if(this.classList.contains('trakt-side-navbar'))return{x:8,y:0,left:8,top:0,right:248,bottom:1050,width:240,height:1050};
  if(this.classList.contains('trakt-side-navbar-content'))return{x:8,y:25,left:8,top:25,right:248,bottom:1050,width:240,height:1025};
  if(this.classList.contains('shell')){const rows=Math.ceil(this.querySelectorAll('.day').length/7)||5,height=rows*320+w.firstRowGrowth+(parseFloat(this.style.paddingTop)||0)+(parseFloat(this.querySelector('.jump-space')?.style.height)||0)+320;return{left:40,right:1400,top:115-scroll,bottom:115-scroll+height,width:1360,height}}
  if(this.classList.contains('day')){const date=new w.Date(this.dataset.date+'T12:00:00'),offset=Math.round((date-new w.Date(2026,8,28,12))/86400000),row=Math.floor(offset/7),height=320+(row===0?w.firstRowGrowth:0),monthScroll=w.document.getElementById('trakt-month-calendar')?.shadowRoot.querySelector('#tmc-month-viewport')?.scrollTop||0,top=115+row*320+(row>0?w.firstRowGrowth:0)-scroll-monthScroll;return{x:40,y:top,left:40,top,right:220,bottom:top+height,width:180,height}}
  const height=this.classList.contains('dayheading')?20:685;
  return{x:40,y:115-scroll,left:40,top:115-scroll,right:1400,bottom:115-scroll+height,width:1360,height}
 };
 w.scrollTo=(x,y)=>{w.lastScrollBehavior=typeof x==='object'?x.behavior:undefined;scroll=Math.max(0,Math.min(typeof x==='object'?x.top:y,w.document.documentElement.scrollHeight-w.innerHeight));w.setTimeout(()=>w.dispatchEvent(new w.Event('scroll')),0)};
 w.eval(`const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,10,12]))}static now(){return RealDate.now()}};`);
 w.eval(fixture.match(/<script>([\s\S]*?)<\/script>/)[1]);
 if(options.seedInitialRelease){
  const existing=w.document.querySelector('trakt-calendar-item');
  const seed=existing.cloneNode(true);
  for(const a of seed.querySelectorAll('a'))a.href='https://app.trakt.tv/shows/bookmark-premiere/seasons/1/episodes/1';
  seed.querySelector('.trakt-card-title').textContent='Already loaded premiere';
  existing.parentElement.append(seed);
 }
 w.eval(fs.readFileSync(path.join(root,'calendar-core.js'),'utf8'));
 const stored={...(options.defaultPreferences?{}:{calendarWeekAuto:false,releasesWeekAuto:false}),...options.preferences},listeners=new Set();
 w.chrome={storage:{local:{get:async()=>{if(options.preferencesDelay)await delay(options.preferencesDelay);return{...stored}},set:async values=>{const changes={};for(const [key,newValue] of Object.entries(values)){changes[key]={oldValue:stored[key],newValue};stored[key]=newValue}for(const listener of listeners)listener(changes,'local')}},onChanged:{addListener:listener=>listeners.add(listener),removeListener:listener=>listeners.delete(listener)}}};
 w.setPreferences=values=>w.chrome.storage.local.set(values);
 w.eval(fs.readFileSync(path.join(root,'preferences.js'),'utf8'));
 let content=fs.readFileSync(path.join(root,'content.js'),'utf8');
 w.eval(fs.readFileSync(path.join(root,'calendar-jump.js'),'utf8'));
 if(options.exposeSession)content=content.replace('  reconcile();\n})();','  reconcile();window.testMonthSession=()=>session;\n})();');
 w.eval(content);
 try{await until(()=>w.document.getElementById(options.preferences?.[(options.releases?'releases':'calendar')+'MonthAuto']===false?'trakt-month-return':'trakt-month-calendar'),15000)}
 catch(error){const notice=w.document.getElementById('trakt-month-return')?.shadowRoot.querySelector('.notice')?.textContent;await w.happyDOM.abort();throw Error(error.message+(notice?'; '+notice:''))}
 return{w,get shadow(){return w.document.getElementById('trakt-month-calendar')?.shadowRoot},get controls(){return w.document.getElementById('trakt-month-controls')?.shadowRoot},async close(){await w.happyDOM.abort()}};
}
async function until(predicate,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return;await delay(50)}throw Error('Timed out waiting for DOM condition')}
const loaded=e=>e.w.document.getElementById('trakt-month-calendar')?.dataset.state==='ready';
const button=(e,label)=>Array.from(e.controls.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===label);
for(const releases of [false,true]){
 const name=releases?'Releases':'Calendar',key=releases?'releases':'calendar';
 test(name+': retained Month View can jump again after Original View',async()=>{
  const e=await setup({releases,preloadedMonth:true});try{
   await until(()=>loaded(e));
   const requests=[e.w.fixture.weekRequests,e.w.fixture.scrollRequests];
   const old=e.w.document.getElementById('trakt-month-calendar');
   e.controls.querySelector('.view-button').click();
   e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('button').click();
   await until(()=>loaded(e));
   const host=e.w.document.getElementById('trakt-month-calendar');assert.notEqual(host,old);
   assert.deepEqual([e.w.fixture.weekRequests,e.w.fixture.scrollRequests],requests,'Reuse retained cards without more week requests');
   e.controls.querySelector('.reset-month').click();
   await until(()=>host.dataset.centeredWeek==='2026-10-05');
   assert(host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop>0);
   host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop=0;
   e.controls.querySelector('.reset-month').click();
   await until(()=>host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop>0);
   assert(host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop>0,'Repeated manual jumps work');
  }finally{await e.close()}
 });
 test(name+': Auto jumps when the current week is loaded, including retained views',async()=>{
  const e=await setup({releases,defaultPreferences:true});try{
   const host=e.w.document.getElementById('trakt-month-calendar');
   await until(()=>host.dataset.centeredWeek==='2026-10-05');
   assert.equal(host.dataset.state,'loading','Jump before the entire month finishes');
   await until(()=>loaded(e));
   e.controls.querySelector('.view-button').click();
   e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('button').click();
   await until(()=>e.w.document.getElementById('trakt-month-calendar')?.dataset.centeredWeek==='2026-10-05');
  }finally{await e.close()}
 });
 test(name+': Manual month startup and live settings stay independent',async()=>{
  const e=await setup({releases,preferences:{[key+'MonthAuto']:false},preferencesDelay:80});try{
   assert.equal(e.shadow,undefined,'Manual opens Original View');
   assert.equal(e.w.fixture.weekRequests,0,'Do not load months in Manual mode');
   e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('button').click();
   await until(()=>loaded(e));
   assert.equal(e.w.document.getElementById('trakt-month-calendar').dataset.centeredWeek,undefined);
   await e.w.setPreferences({[key+'WeekAuto']:true});
   await until(()=>e.w.document.getElementById('trakt-month-calendar').dataset.centeredWeek==='2026-10-05');
   assert.equal(e.w.document.getElementById('trakt-month-calendar').dataset.centeredWeek,'2026-10-05');
   await e.w.setPreferences({[key+'MonthAuto']:true});
   await e.w.setPreferences({[key+'MonthAuto']:false});
   assert.equal(e.shadow,undefined);
   await e.w.setPreferences({[key+'MonthAuto']:true});
   await until(()=>loaded(e));
   await until(()=>e.w.document.getElementById('trakt-month-calendar').dataset.centeredWeek==='2026-10-05');
   assert.equal(e.w.document.getElementById('trakt-month-calendar').dataset.centeredWeek,'2026-10-05');
   const host=e.w.document.getElementById('trakt-month-calendar');
   await e.w.setPreferences({[(releases?'calendar':'releases')+'MonthAuto']:false});
   assert.equal(e.w.document.getElementById('trakt-month-calendar'),host,'Other section settings do not change this view');
  }finally{await e.close()}
 });
}
test('Releases grid uses the same resting top as Calendar despite a different native offset',async()=>{
 const e=await setup({controlsGap:true,releasesOffset:-28});try{
  const top=e.shadow.querySelector('.shell').style.paddingTop;
  const controls=e.w.document.getElementById('trakt-month-controls').style.top;
  await e.w.fixture.routeTo('/discover/releases');
  await until(()=>e.shadow && e.w.document.querySelector('.tmc-native-source')?.querySelector('#periods')?.isConnected);
  await until(()=>e.w.document.getElementById('trakt-month-calendar')?.shadowRoot.querySelector('.shell').style.paddingTop===top);
  assert.equal(e.w.document.getElementById('trakt-month-controls').style.top,controls);
  assert.equal(e.w.document.querySelector('.svelte-y0esg').getBoundingClientRect().top,100,'Leave native Releases geometry unchanged');
 }finally{await e.close()}
});
test('automatic Releases jump waits for preceding cards and row heights to settle',async()=>{
 const e=await setup({releases:true,defaultPreferences:true,busyEarlierPeriod:true,exposeSession:true});try{
  await until(()=>e.w.testMonthSession().displayThrough>='2026-10-11');
  e.w.fixture.stuck=true;
  await delay(950);
  const host=e.w.document.getElementById('trakt-month-calendar');
  assert.equal(host.dataset.centeredWeek,undefined,'A busy previous period must block the jump');
  const anchor=e.w.fixture.pendingEarlier.querySelector('#day-2026-10-1');
  anchor.append(host.querySelector('.tmc-native-card[data-date="2026-10-01"] trakt-calendar-item').cloneNode(true));
  e.w.firstRowGrowth=150;e.w.fixture.pendingEarlier.setAttribute('aria-busy','false');
  await delay(350);assert.equal(host.dataset.centeredWeek,undefined,'Wait for the changed prefix to settle');
  await until(()=>host.dataset.centeredWeek==='2026-10-05');
  assert.equal(host.dataset.state,'loading','Later weeks do not delay the current-week jump');
  assert.equal(host.querySelectorAll('.tmc-native-card[data-date="2026-10-01"]').length,2);
 }finally{await e.close()}
});
test('filter bar and calendar share wheel scrolling and preserve zoom, menus and Original View',async()=>{
 const e=await setup({preloadedMonth:true});try{
  await until(()=>loaded(e));const viewport=e.shadow.querySelector('#tmc-month-viewport'),header=e.w.document.querySelector('header');
  Object.defineProperties(viewport,{scrollHeight:{configurable:true,value:2400},clientHeight:{configurable:true,value:1050}});
  const wheel=(target,init={})=>{const event=new e.w.WheelEvent('wheel',{bubbles:true,composed:true,cancelable:true,deltaY:180,...init});Object.defineProperty(event,'ctrlKey',{value:!!init.ctrlKey});target.dispatchEvent(event);return event};
  assert(wheel(header).defaultPrevented);await until(()=>viewport.scrollTop===180);assert.equal(viewport.scrollTop,180);
  assert(!wheel(header,{ctrlKey:true}).defaultPrevented);assert.equal(viewport.scrollTop,180);
  viewport.scrollTop=0;
  assert(wheel(viewport).defaultPrevented);await until(()=>viewport.scrollTop===180);assert.equal(viewport.scrollTop,180,'Use the same wheel distance on both surfaces');
  viewport.scrollTop=0;
  wheel(header,{deltaY:90});wheel(viewport,{deltaY:90});await until(()=>viewport.scrollTop===180);
  assert.equal(viewport.scrollTop,180,'Moving between surfaces during one wheel burst must preserve its distance');
  const menu=e.w.document.createElement('div');menu.className='trakt-drawer';header.append(menu);
  assert(!wheel(menu).defaultPrevented);assert.equal(viewport.scrollTop,180);
  const dropdown=e.w.document.createElement('div');dropdown.style.overflowY='auto';Object.defineProperties(dropdown,{scrollHeight:{value:300},clientHeight:{value:100}});header.append(dropdown);
  assert(!wheel(dropdown).defaultPrevented);assert.equal(viewport.scrollTop,180);
  const request=e.w.requestAnimationFrame,cancel=e.w.cancelAnimationFrame,frames=new Map();let next=0;
  e.w.requestAnimationFrame=callback=>{frames.set(++next,callback);return next};e.w.cancelAnimationFrame=id=>frames.delete(id);
  const trace=target=>{
   viewport.scrollTop=0;wheel(target,{deltaY:240});const positions=[];
   for(const time of [0,16,33,50,83,100,150,200,300,400,500,600]){const callbacks=Array.from(frames.values());frames.clear();for(const callback of callbacks)callback(time);positions.push(viewport.scrollTop)}
   assert.equal(viewport.scrollTop,240);return positions;
  };
  assert.deepEqual(trace(header),trace(viewport),'Identical wheel input and frame timing must give identical easing on both surfaces');
  e.w.requestAnimationFrame=request;e.w.cancelAnimationFrame=cancel;
  e.controls.querySelector('.view-button').click();assert(!wheel(header).defaultPrevented,'Remove forwarding in Original View');
 }finally{await e.close()}
});
test('wheel scrolling reaches both ends when scroll offsets are rounded to whole pixels',async()=>{
 const e=await setup({preloadedMonth:true});try{
  await until(()=>loaded(e));const viewport=e.shadow.querySelector('#tmc-month-viewport');
  Object.defineProperties(viewport,{scrollHeight:{configurable:true,value:1569},clientHeight:{configurable:true,value:1050}});
  viewport.scrollTop=0;
  viewport.scrollTo=function({top}){this.scrollTop=Math.floor(top);e.w.setTimeout(()=>this.dispatchEvent(new e.w.Event('scroll')),0)};
  const wheel=(target,deltaY)=>target.dispatchEvent(new e.w.WheelEvent('wheel',{bubbles:true,composed:true,cancelable:true,deltaY}));
  wheel(e.w.document.querySelector('header'),10000);await until(()=>viewport.scrollTop===519);
  wheel(viewport,-10000);await until(()=>viewport.scrollTop===0);
 }finally{await e.close()}
});
test('mounting many cards batches geometry reads before DOM moves',async()=>{
 const e=await setup({preloadedMonth:true,exposeSession:true});try{
  await until(()=>loaded(e));const session=e.w.testMonthSession(),anchor=session.source.querySelector('#day-2026-10-1');
  const original=session.host.querySelector('trakt-calendar-item');
  for(let i=0;i<20;i++)anchor.append(original.cloneNode(true));
  const before=session.source.querySelectorAll('.tmc-native-card-space').length,base=e.w.HTMLElement.prototype.getBoundingClientRect;let interleaved=0;
  e.w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.matches('trakt-calendar-item') && session.source.querySelectorAll('.tmc-native-card-space').length>before)interleaved++;return base.call(this)};
  session.collectNativeCards();assert.equal(interleaved,0,'No card geometry reads after starting the DOM moves');
  assert.equal(session.source.querySelectorAll('.tmc-native-card-space').length,before+20);
 }finally{await e.close()}
});
test('a committed native month is reused immediately after its periods remount',async()=>{
 const e=await setup({releases:true,preloadedMonth:true});try{
  await until(()=>loaded(e));const requests=[e.w.fixture.weekRequests,e.w.fixture.scrollRequests];
  e.controls.querySelector('.view-button').click();
  for(const period of e.w.document.querySelectorAll('.trakt-calendar-items'))period.replaceWith(period.cloneNode(true));
  e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('button').click();
  assert(loaded(e));assert.deepEqual([e.w.fixture.weekRequests,e.w.fixture.scrollRequests],requests);
 }finally{await e.close()}
});
test('SPA departure cleans up the overlay and cancellation prevents further loading', {timeout:10000},async()=>{
 const e=await setup();try{
  e.w.document.getElementById('away').click();
  await until(()=>!e.shadow);
  const count=e.w.fixture.weekRequests;await delay(1100);
  assert.equal(e.w.fixture.weekRequests,count);
 }finally{await e.close()}
});
test('localized dates cross years and duplicate anchors are deduplicated',async()=>{
 const e=await setup();try{
  const C=e.w.TraktMonthCore,source=e.w.document.createElement('div');
  for(let i=0;i<7;i++){const d=new Date(2026,11,28+i,12),b=e.w.document.createElement('button');b.className='trakt-calendar-day-button';b.innerHTML=`<span>${d.toLocaleDateString('fr',{month:'short'})}</span><span>${d.getDate()}</span><span>jour</span>`;source.append(b)}
  const dates=C.toolbarDates(source,new Date(2027,0,1),'fr').map(C.key);
  assert.equal(dates[0],'2026-12-28');assert.equal(dates[6],'2027-01-03');
  source.innerHTML='<div class="calendar-day-anchor" id="day-2026-10-1"><div class="calendar-day-anchor" id="day-2026-10-1"><trakt-calendar-item><a href="/shows/a/seasons/1/episodes/1">Episode</a><p class="trakt-card-title">A</p></trakt-calendar-item><trakt-calendar-item><a href="javascript:alert(1)">Bad</a></trakt-calendar-item></div></div>';
  assert.equal(C.readEntries(source,'https://app.trakt.tv').get('2026-10-01').length,1);
 }finally{await e.close()}
});

test('opening the filter funnel preserves loaded cards and controls have blurred surfaces', {timeout:45000},async()=>{
 const e=await setup();try{
  await until(()=>loaded(e));
  const card=e.shadow.querySelector('.native-release'),requests=e.w.fixture.weekRequests;
  const wrapper=e.w.document.createElement('div');wrapper.className='trakt-filter-button';
  const funnel=e.w.document.createElement('button');funnel.textContent='Filters';wrapper.append(funnel);e.w.document.body.append(wrapper);
  funnel.click();await delay(1000);
  assert(loaded(e));assert.equal(e.w.fixture.weekRequests,requests);assert.equal(e.shadow.querySelector('.native-release'),card);
  const style=e.w.getComputedStyle(e.controls.querySelector('.view-button'));
  assert(style.backdropFilter.includes('blur'));assert(style.borderRadius);
 }finally{await e.close()}
});

test('Original Releases selector is fixed with reserved native loader space',async()=>{
 const e=await setup({releases:true,controlsGap:true});try{
  button(e,'Return to Trakt’s original calendar').click();
  const nav=e.w.document.querySelector('.calendar-navigation');
  assert.equal(e.w.getComputedStyle(nav).position,'fixed');
  assert.equal(e.w.getComputedStyle(nav).top,'128px');
  const space=e.w.document.querySelector('.tmc-original-nav-space');assert(space);
  assert.equal(space.style.height,'140px');
  nav.classList.add('is-scrolled');assert.equal(e.w.getComputedStyle(nav).top,'128px');
  e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('.view-button').click();
  assert(!e.w.document.querySelector('.tmc-original-nav-space'));
 }finally{await e.close()}
});

test('controls sit in the native gap without moving either boundary',async()=>{
 const e=await setup({controlsGap:true});try{
  const controls=e.w.document.getElementById('trakt-month-controls');
  assert.equal(controls.style.top,'72px');
  assert.equal(e.shadow.querySelector('.shell').style.paddingTop,'128px');
  assert.equal(controls.style.position,'fixed');
  assert.equal(e.w.document.querySelector('.svelte-9b8fk1').getBoundingClientRect().bottom,64);
  assert.equal(e.w.document.querySelector('.svelte-y0esg').getBoundingClientRect().top,128);
 }finally{await e.close()}
});

test('fixed controls have a centered navigation gap and padded uppercase dates',async()=>{
 const e=await setup();try{
  const controls=e.w.document.getElementById('trakt-month-controls');
  assert.equal(controls.style.position,'fixed');assert.equal(controls.parentElement,e.w.document.body);
  assert.equal(controls.style.zIndex,'calc(var(--layer-overlay,777) + 1)');
  assert.deepEqual(Array.from(e.controls.querySelectorAll('.month-nav button')).map(b=>b.textContent),['Previous Month','Next Month']);
  assert.equal(e.w.getComputedStyle(e.controls.querySelector('.month-nav')).left,'50%');
  const heading=e.shadow.querySelector('[data-date="2026-10-01"] .dayheading');
  assert.equal(heading.firstElementChild.textContent,'OCT');assert.equal(heading.children[1].textContent,'01');
  assert.equal(e.w.getComputedStyle(e.controls.querySelector('.view-button')).pointerEvents,'auto');
  button(e,'Return to Trakt’s original calendar').click();assert(!e.w.document.getElementById('trakt-month-controls'));
 }finally{await e.close()}
});

test('month placeholders mount before the native calendar initial request finishes', {timeout:45000},async()=>{
 const e=await setup({delayedStartup:true});try{
  assert.equal(e.w.document.querySelectorAll('.trakt-calendar-day-button').length,0);
  assert.equal(e.shadow.querySelectorAll('.day').length,35);
  assert.equal(e.shadow.querySelector('.calendar').style.visibility,'visible');
  assert(e.shadow.textContent.includes('Loading…'));
  try{await until(()=>loaded(e))}catch(error){throw Error(error.message+'; '+e.controls?.querySelector('.status')?.textContent+'; periods='+e.w.document.querySelectorAll('.trakt-calendar-items').length+'; first='+e.w.fixture.first)};
  assert.equal(e.shadow.querySelectorAll('.native-release').length,11);
 }finally{await e.close()}
});

test('distant native month navigation jumps directly to the first week and populates the month', {timeout:90000},async()=>{
 const e=await setup({nativeDateNavigation:true,exposeSession:true});try{
  await until(()=>loaded(e));const requests=e.w.fixture.weekRequests;
  e.w.testMonthSession().navigate(new e.w.Date(2025,9,1,12));
  await until(()=>loaded(e),60000);
  const first=new e.w.Date(e.w.fixture.first);
  assert.equal(first.getFullYear(),2025);assert.equal(first.getMonth(),8);assert.equal(first.getDate(),29);
  assert.equal(e.w.fixture.weekRequests-requests,1,'One native click should replace a year of weekly navigation');
  assert(e.shadow.querySelector('[data-date="2025-10-01"]'));
  assert(e.shadow.querySelectorAll('.native-release').length>0);
  assert(!e.w.fixture.loadedWeeks.includes('2026-09-21'));
 }finally{await e.close()}
});

test('native watched controls are kept without overlays and show links use glance hrefs', {timeout:45000},async()=>{
 const e=await setup({nativePopupIcons:true,drawerLinks:true});try{
  await until(()=>loaded(e));
  const host=e.w.document.getElementById('trakt-month-calendar');
  assert.equal(host.querySelector('.watched-toggle,.tmc-watch-icon,.tmc-native-watch-icon'),null);
  assert.equal(e.shadow.querySelector('.watched-toggle'),null);
  assert(!e.w.document.querySelector('.trakt-popup-menu-container'),'Do not probe or open native menus automatically');
  const wrapper=host.querySelector('.tmc-native-card[data-date="2026-10-01"]');
  const showLink=wrapper.querySelector('.trakt-card-title').closest('a');
  assert.equal(new URL(showLink.href).searchParams.get('view'),'glance');
  assert.equal(new URL(showLink.href).searchParams.get('glance_type'),'show');
  let proxy;
  e.w.document.addEventListener('click',event=>{if(event.target.matches('a[data-sveltekit-noscroll]') && !host.contains(event.target)){event.preventDefault();proxy=event.target}});
  wrapper.querySelector('.trakt-card-title').click();assert(proxy);
  assert.equal(new URL(proxy.href).searchParams.get('glance_slug'),'Harbour');
  wrapper.querySelector('.trakt-popup-menu-button').click();
  await until(()=>e.w.document.querySelector('.trakt-popup-menu-container'));
  e.w.document.querySelector('.trakt-popup-menu-container [role=button]').click();
  assert.equal(e.w.probeWatchClicks,1);
  e.controls.querySelector('.view-button').click();
  assert.equal(new URL(showLink.href).pathname,'/shows/Harbour','Restore Original View show-page link');
 }finally{await e.close()}
});

test('switching to another month resets the calendar viewport before loading', {timeout:45000},async()=>{
 const e=await setup();try{
  await until(()=>loaded(e));
  const host=e.w.document.getElementById('trakt-month-calendar');host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop=500;
  button(e,'Previous month').click();
  assert.equal(host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop,0,'A different month must not inherit current-week scroll');
  await until(()=>loaded(e));assert.equal(host.shadowRoot.querySelector('#tmc-month-viewport').scrollTop,0);
  assert(e.shadow.querySelector('[data-date="2026-09-01"]'));
 }finally{await e.close()}
});

 test('manual week mode only jumps on request and cards omit years',async()=>{
 const e=await setup({preloadedMonth:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>e.shadow.querySelector('[data-date="2026-10-31"] .native-release'));
  assert.equal(host.dataset.centeredWeek,undefined);
  assert.equal(e.shadow.querySelector('.year'),null);
  e.controls.querySelector('.reset-month').click();
  await until(()=>host.dataset.centeredWeek==='2026-10-05');
 }finally{await e.close()}
});
 test('current week request switches back from another month',async()=>{
 const e=await setup({preloadedMonth:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>e.shadow.querySelector('[data-date="2026-10-31"] .native-release'));
  e.controls.querySelector('.month-nav button').click();
  await until(()=>e.shadow.querySelector('[data-date="2026-09-01"]'));
  e.controls.querySelector('.reset-month').click();
  await until(()=>host.dataset.centeredWeek==='2026-10-05');
  assert(e.shadow.querySelector('[data-date="2026-10-10"]'));
 }finally{await e.close()}
});

test('current week jump leaves manual scrolling in control after layout updates',async()=>{
 const e=await setup({preloadedMonth:true,exposeSession:true});try{
  await until(()=>loaded(e));
  e.controls.querySelector('.reset-month').click();
  const viewport=e.shadow.querySelector('#tmc-month-viewport');
  viewport.scrollTop=500;e.w.firstRowGrowth=150;
  e.w.testMonthSession().position();e.w.testMonthSession().render();
  await delay(100);
  assert.equal(viewport.scrollTop,500);
  assert.equal(e.w.getComputedStyle(e.w.document.getElementById('trakt-month-calendar')).overflow,'hidden');
 }finally{await e.close()}
});

 test('monthly slots reuse exact native cards and images, then restore Original View',async()=>{
 const e=await setup({preloadedMonth:true,nativeIdentity:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>host.dataset.state==='ready');
  const wrappers=Array.from(host.querySelectorAll('.tmc-native-card'));
  assert.equal(wrappers.length,11);
  assert.equal(e.shadow.querySelectorAll('.native-release slot').length,11);
  assert.equal(e.shadow.querySelectorAll('.native-release img').length,0,'Native images must not be copied');
  const card=wrappers[0].querySelector('trakt-calendar-item'),image=card.querySelector('img');
  assert(e.w.nativeImages.includes(image),'Reuse the same native image instance');
  card.dispatchEvent(new e.w.Event('native-probe'));
  assert.equal(e.w.nativeProbeClicks,1,'Native event handlers stay attached');
  assert(card.querySelector('.tmc-native-details'));
  e.controls.querySelector('.view-button').click();
  assert(card.closest('.trakt-calendar-layout'),'Restore native parent');
  assert.equal(card.querySelector('img'),image);
  assert.equal(card.querySelector('.tmc-native-details'),null,'Remove extension-only details on restore');
  assert.equal(e.w.document.querySelector('.tmc-native-card-space'),null);
  card.dispatchEvent(new e.w.Event('native-probe'));
  assert.equal(e.w.nativeProbeClicks,2);
  e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('.view-button').click();
  await until(()=>e.w.document.getElementById('trakt-month-calendar').querySelector('img')===image);
 }finally{await e.close()}
});
 test('unrendered native shells use monthly viewport loading without hidden scroll hydration',async()=>{
 const e=await setup({preloadedMonth:true,viewportCards:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>host.dataset.state==='ready');
  assert.equal(e.w.revealedCards,undefined,'Do not scroll hidden cards to force rendering');
  const native=host.querySelector('.tmc-native-card .trakt-card-content:not(.is-visible)');
  assert(native,'Mount a genuine unrendered native card');
  assert(e.shadow.querySelector('.native-release slot'));
  native.append(...native._pending);native.classList.add('is-visible');
  const image=native.querySelector('img');
  await until(()=>native.closest('trakt-calendar-item').querySelector('.tmc-native-details'));
  assert.equal(native.querySelector('img'),image,'Native hydration must not recreate the image');
  assert.equal(e.shadow.querySelectorAll('.native-release img').length,0);
 }finally{await e.close()}
});
 test('native monthly cards survive filter refresh and month navigation',async()=>{
 const e=await setup({preloadedMonth:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>host.dataset.state==='ready');
  e.w.document.getElementById('filter').click();
  await until(()=>host.dataset.state==='ready' && host.querySelector('.trakt-card-title')?.textContent==='Moonrise');
  assert(Array.from(host.querySelectorAll('.trakt-card-title')).every(n=>n.textContent==='Moonrise'));
  e.controls.querySelector('.month-nav button:last-child').click();
  await until(()=>host.dataset.state==='ready' && e.shadow.querySelector('[data-date="2026-11-01"]'));
  assert(Array.from(host.querySelectorAll('.tmc-native-card')).every(n=>n.dataset.date.startsWith('2026-11-')));
 }finally{await e.close()}
});

 test('native full-season image and season label open the season glance',async()=>{
 const e=await setup({preloadedMonth:true,fullSeason:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>host.dataset.state==='ready');
  const wrapper=host.querySelector('.tmc-native-card');let proxy;
  e.w.document.addEventListener('click',event=>{if(event.target.matches('a[data-sveltekit-noscroll]')){event.preventDefault();proxy=event.target}});
  wrapper.querySelector('img').click();
  assert.equal(new URL(proxy.href).searchParams.get('view'),'glance-season');
  assert.equal(new URL(proxy.href).searchParams.get('glance_season'),'2');
  proxy=null;wrapper.querySelector('.tmc-season-link').click();
  assert.equal(new URL(proxy.href).searchParams.get('view'),'glance-season');
 }finally{await e.close()}
});

 test('multiple native cards per day use unique slots and restore in order',async()=>{
 const e=await setup({preloadedMonth:true,multipleReleases:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>host.dataset.state==='ready');
  const wrappers=Array.from(host.querySelectorAll('.tmc-native-card'));
  assert.equal(wrappers.length,22);assert.equal(new Set(wrappers.map(n=>n.id)).size,22);
  assert.equal(new Set(wrappers.map(n=>n.slot)).size,22);
  const first=wrappers.filter(n=>n.dataset.date==='2026-10-01').map(n=>n.querySelector('trakt-calendar-item'));
  assert.equal(first.length,2);
  e.controls.querySelector('.view-button').click();
  const restored=Array.from(e.w.document.querySelector('#day-2026-10-1').querySelectorAll('trakt-calendar-item'));
  assert.deepEqual(restored,first);
 }finally{await e.close()}
});

 test('partial native snapshots keep native cards throughout the Original View round trip',async()=>{
 const e=await setup({preloadedMonth:true,viewportCards:true});try{
  let host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>host.dataset.state==='ready');
  const content=host.querySelector('.trakt-card-content');content.append(...content._pending);content.classList.add('is-visible');
  await until(()=>content.closest('trakt-calendar-item').querySelector('.tmc-native-details'));
  const image=content.querySelector('img');
  e.controls.querySelector('.view-button').click();
  e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('.view-button').click();
  host=e.w.document.getElementById('trakt-month-calendar');let legacyFrames=0;
  const observer=new e.w.MutationObserver(()=>{if(host.shadowRoot.querySelector('.release-link'))legacyFrames++});observer.observe(host.shadowRoot,{childList:true,subtree:true});
  assert.equal(host.querySelector('.trakt-card-content img'),image);
  assert.equal(host.shadowRoot.querySelector('.release-link'),null);
  await until(()=>host.dataset.state==='ready');await delay(300);observer.disconnect();
  assert.equal(legacyFrames,0);assert.equal(host.querySelector('.trakt-card-content img'),image);
 }finally{await e.close()}
});

test('native day cells and slots stay attached during later card hydration',async()=>{
 const e=await setup({preloadedMonth:true,viewportCards:true});try{
  const host=e.w.document.getElementById('trakt-month-calendar');
  await until(()=>loaded(e));
  const day=e.shadow.querySelector('[data-date="2026-10-01"]');
  const slot=day.querySelector('slot'),view=slot.parentElement;
  let removals=0;
  const observer=new e.w.MutationObserver(changes=>{
   for(const change of changes)for(const node of change.removedNodes)if(node===day || node===view || node.contains?.(slot))removals++;
  });observer.observe(e.shadow,{childList:true,subtree:true});
  const contents=Array.from(host.querySelectorAll('.trakt-card-content'));
  for(const content of contents){content.append(...content._pending);content.classList.add('is-visible');await delay(150);}
  assert.equal(e.shadow.querySelector('[data-date="2026-10-01"]'),day);
  assert.equal(day.querySelector('slot'),slot);
  assert.equal(removals,0,'Updates must not detach the hovered card or its slot');
  observer.disconnect();
 }finally{await e.close()}
});

test('Calendar and Releases wait for their own DOM and reload every day without legacy cards',{timeout:60000},async()=>{
 const e=await setup();try{
  await until(()=>loaded(e));
  for(const path of ['/discover/releases','/calendar','/discover/releases']){
   const previous=e.w.document.querySelector('.trakt-calendar-layout');
   const requests=e.w.fixture.weekRequests;
   const commit=e.w.fixture.routeTo(path,{commitDelay:900,cardDelay:1200});
   await delay(650);
   assert(!e.w.document.getElementById('trakt-month-calendar'),'Do not start the new route on the retiring source');
   assert.equal(e.w.fixture.weekRequests,requests,'The old loader must stop immediately');
   const source=await commit;
   await until(()=>loaded(e));
   const host=e.w.document.getElementById('trakt-month-calendar');
   assert.notEqual(source,previous);
   assert.equal(host.shadowRoot.querySelector('.release-link,.release-body'),null);
   const dates=Array.from(host.querySelectorAll('.tmc-native-card')).map(n=>n.dataset.date);
   if(path==='/discover/releases'){
    assert.equal(dates.length,31);
    for(let day=1;day<=31;day++)assert(dates.includes('2026-10-'+String(day).padStart(2,'0')),'Missing Releases day '+day);
    assert(Array.from(host.querySelectorAll('.trakt-card-title')).every(n=>n.textContent==='Moonrise'));
   }else{
    assert.equal(dates.length,11);
    assert(Array.from(host.querySelectorAll('.trakt-card-title')).every(n=>n.textContent.startsWith('Harbour')));
   }
   assert.equal(host.shadowRoot.querySelectorAll('.empty').length,31-new Set(dates).size);
  }
 }finally{await e.close()}
});

test('switching routes mid-load cancels the old fill and resolves late Releases period shells',{timeout:45000},async()=>{
 const e=await setup();try{
  await until(()=>e.w.document.querySelector('.tmc-native-card[data-date="2026-10-01"]'));
  assert(!loaded(e));
  await e.w.fixture.routeTo('/discover/releases',{cardDelay:1600});
  await until(()=>e.shadow?.querySelector('[data-date="2026-10-01"]'));
  assert.equal(e.shadow.querySelector('[data-date="2026-10-02"] .empty')?.textContent,'Loading…');
  await until(()=>loaded(e));
  const host=e.w.document.getElementById('trakt-month-calendar');
  assert.equal(host.querySelectorAll('.tmc-native-card').length,31);
  assert.equal(e.shadow.querySelectorAll('.empty').length,0);
 }finally{await e.close()}
});

test('replaced native periods invalidate an Original View snapshot',{timeout:45000},async()=>{
 const e=await setup();try{
  await until(()=>loaded(e));
  e.controls.querySelector('.view-button').click();
  const source=e.w.document.querySelector('.trakt-calendar-layout');
  e.w.document.getElementById('today').click();
  assert.equal(source.querySelectorAll('.trakt-calendar-items').length,1);
  e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('.view-button').click();
  assert(!loaded(e),'Do not mark replaced native periods as a completed month');
  assert.equal(e.shadow.querySelector('.release-link,.release-body'),null);
  await until(()=>loaded(e));
  assert.equal(e.w.document.querySelectorAll('.tmc-native-card').length,11);
 }finally{await e.close()}
});

test('a stalled native append keeps earlier live cards and retry loads missing dates',{timeout:45000},async()=>{
 const e=await setup();try{
  await until(()=>e.w.document.querySelector('.tmc-native-card[data-date="2026-10-01"]'));
  const host=e.w.document.getElementById('trakt-month-calendar');
  const card=host.querySelector('trakt-calendar-item'),slot=e.shadow.querySelector('slot');
  e.w.fixture.stuck=true;
  await until(()=>host.dataset.state==='partial');
  assert.equal(e.shadow.querySelector('slot'),slot);
  assert(card.isConnected);
  assert.equal(e.w.fixture.weekRequests,1,'Do not replace earlier native weeks when append stalls');
  assert(e.shadow.textContent.includes('Not loaded'));
  e.w.fixture.stuck=false;
  button(e,'Load remaining month entries').click();
  assert.equal(e.shadow.querySelector('slot'),slot,'Retry retains existing slots');
  await until(()=>loaded(e));
  assert.equal(host.querySelectorAll('.tmc-native-card').length,11);
  assert(card.isConnected);
 }finally{await e.close()}
});

test('a filter URL change reuses the source container while reloading its native periods',{timeout:45000},async()=>{
 const e=await setup();try{
  await until(()=>loaded(e));
  const source=e.w.document.querySelector('.trakt-calendar-layout');
  e.w.history.pushState({},'','/calendar?media=movies');
  e.w.document.getElementById('filter').click();
  await until(()=>e.w.document.getElementById('trakt-month-calendar')?.dataset.state==='loading');
  await until(()=>loaded(e));
  assert.equal(e.w.document.querySelector('.trakt-calendar-layout'),source);
  const cards=Array.from(e.w.document.querySelectorAll('.tmc-native-card'));
  assert.equal(cards.length,11);
  assert(cards.every(n=>n.querySelector('.trakt-card-title').textContent==='Moonrise'));
 }finally{await e.close()}
});

test('a six-week empty month passes the native five-empty-period limit',{timeout:45000},async()=>{
 const e=await setup({emptyCalendar:true,emptyLimit:true,nativeDateNavigation:true,exposeSession:true});try{
  await until(()=>loaded(e));
  e.w.testMonthSession().navigate(new e.w.Date(2026,2,1,12));
  await until(()=>loaded(e));
  assert(e.shadow.querySelector('[data-date="2026-03-31"]'));
  assert.equal(e.shadow.querySelectorAll('.empty').length,31);
  assert(Array.from(e.shadow.querySelectorAll('.empty')).every(n=>n.textContent==='No releases'));
  assert.equal(e.w.document.querySelectorAll('.tmc-native-card').length,0);
 }finally{await e.close()}
});

test('opening and closing ellipsis portals keeps native cards, images and slots intact',async()=>{
 const e=await setup({preloadedMonth:true,nativePopupIcons:true});try{
  await until(()=>loaded(e));
  const host=e.w.document.getElementById('trakt-month-calendar');
  const wrappers=Array.from(host.querySelectorAll('.tmc-native-card'));
  const images=wrappers.map(n=>n.querySelector('img'));
  const slots=Array.from(e.shadow.querySelectorAll('.native-release slot'));
  const requests=[e.w.fixture.weekRequests,e.w.fixture.scrollRequests];
  const more=wrappers[0].querySelector('.trakt-popup-menu-button');
  const outside=e.w.document.createElement('button');outside.className='trakt-popup-menu-button';outside.innerHTML='<svg><path d="M4 12h16"/></svg>';e.w.document.querySelector('header').append(outside);e.w.fixture.attachPopup(outside);
  for(const trigger of [more,outside]){
   for(const close of ['clone','underlay','escape','trigger']){
    trigger.querySelector('path').dispatchEvent(new e.w.MouseEvent('click',{bubbles:true}));
    assert(e.w.document.querySelector('[data-popup-clone]'));
    if(close==='clone')e.w.document.querySelector('[data-popup-clone] path').dispatchEvent(new e.w.MouseEvent('click',{bubbles:true}));
    else if(close==='underlay')e.w.document.getElementById('trakt-portal-underlay').click();
    else if(close==='escape')e.w.document.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    else trigger.click();
    assert.equal(e.w.document.querySelector('.trakt-popup-menu-container'),null);
    assert(Array.from(host.querySelectorAll('.tmc-native-card')).every((n,i)=>n===wrappers[i]) && host.querySelectorAll('.tmc-native-card').length===wrappers.length,'Do not restore/remount cards on a menu click');
   }
  }
  await delay(1200);
  assert(loaded(e));
  assert(Array.from(host.querySelectorAll('.tmc-native-card')).every((n,i)=>n===wrappers[i]));
  assert(wrappers.every((n,i)=>n.querySelector('img')===images[i]));
  assert(Array.from(e.shadow.querySelectorAll('.native-release slot')).every((n,i)=>n===slots[i]));
  assert.deepEqual([e.w.fixture.weekRequests,e.w.fixture.scrollRequests],requests);
 }finally{await e.close()}
});

test('ellipsis controls in Original View preserve its reusable month snapshot',async()=>{
 const e=await setup({preloadedMonth:true,nativePopupIcons:true});try{
  await until(()=>loaded(e));
  const requests=[e.w.fixture.weekRequests,e.w.fixture.scrollRequests];
  e.controls.querySelector('.view-button').click();
  const trigger=e.w.document.querySelector('.trakt-calendar-layout .trakt-popup-menu-button');
  trigger.click();e.w.document.querySelector('[data-popup-clone]').click();
  e.w.document.getElementById('trakt-month-return').shadowRoot.querySelector('.view-button').click();
  assert(loaded(e),'Closing a menu must not invalidate completed native coverage');
  await delay(1200);
  assert.deepEqual([e.w.fixture.weekRequests,e.w.fixture.scrollRequests],requests);
 }finally{await e.close()}
});
