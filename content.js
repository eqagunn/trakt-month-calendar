(function () {
  'use strict';
  const VERSION='1.0.1';
  if (window.__traktMonthCalendar) return;
  window.__traktMonthCalendar = true;
  const C = globalThis.TraktMonthCore;
  let session = null;
  const calendarLayouts=new Map();
  let lastUrl = location.href;
  let bypassUrl = null;
  let returnHost = null;
  const originalNavPins=new Map();
  function unpinOriginalNavigation(source){
    for(const [navigation,space] of originalNavPins)if(!source || source.contains(navigation)){space.remove();originalNavPins.delete(navigation)}
  }
  function pinOriginalNavigation(source){
    const navigation=source.querySelector('.calendar-navigation');
    if(!navigation || originalNavPins.has(navigation))return;
    const rect=navigation.getBoundingClientRect(),style=getComputedStyle(navigation);
    const layout=calendarLayouts.get(new URL(location.href).pathname.replace(/\/$/,''));
    const space=element('div',undefined,'tmc-original-nav-space');
    space.setAttribute('aria-hidden','true');space.style.cssText='height:'+rect.height+'px;width:'+rect.width+'px;flex-shrink:0';
    space.style.margin=style.margin;navigation.before(space);originalNavPins.set(navigation,space);
    navigation.style.setProperty('--tmc-original-nav-top',Math.max(0,layout?.gridTop??rect.top)+'px');
    navigation.style.setProperty('--tmc-original-nav-left',rect.left+'px');
    navigation.style.setProperty('--tmc-original-nav-width',rect.width+'px');
    navigation.style.setProperty('--tmc-original-nav-gap',style.gap==='normal'?'var(--gap-s,8px)':style.gap);
    source.classList.add('tmc-original-calendar');
  }
  let controlsPlacement=null;
  let rememberedMonth = null;
  let rememberedSnapshot = null;
  let retiringSource=null;
  const calendarPageUrl=value=>{const url=new URL(value);for(const key of ['view','glance_type','glance_slug','glance_season','glance_episode'])url.searchParams.delete(key);return url.href};
  const onCalendar = () => /^\/(?:calendar|discover\/releases)\/?$/.test(location.pathname);
  // Trakt portals a cloned trigger into the body while a menu is open. Neither
  // that clone nor the original trigger changes calendar filters.
  const popupControls='.trakt-popup-menu-button,.trakt-popup-menu-container,[data-popup-clone],#trakt-portal-underlay';
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const css = `
    :host{display:block;color:inherit;font-family:inherit;font-size:var(--font-size-text,14px);line-height:inherit;color-scheme:dark}
    .month-viewport{height:100%;width:100%;min-height:0;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;overflow-anchor:none;scrollbar-width:auto!important;scrollbar-color:auto!important}
    @supports (-moz-appearance:none){.month-viewport{scrollbar-color:var(--cm-color-foreground-50,#ffffff80) transparent!important}}
    .month-viewport::-webkit-scrollbar{display:block!important;width:var(--layout-scrollbar-width,8px)!important}.month-viewport::-webkit-scrollbar-track{background:transparent!important}.month-viewport::-webkit-scrollbar-thumb{background:var(--cm-color-foreground-50,#ffffff80)!important;border-radius:var(--border-radius-xs,4px)}.month-viewport::-webkit-scrollbar-thumb:hover{background:var(--color-foreground,#eee)!important}
    *{box-sizing:border-box}button,input{font:inherit;min-width:0}button{cursor:pointer;color:inherit;background:var(--color-background-secondary,#252830);border:1px solid var(--color-border,#3c404a);border-radius:8px;padding:6px 8px}button:hover{filter:brightness(1.2)}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid currentColor;outline-offset:2px}
    .shell,.calendar{width:100%;min-width:0}.grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
    .day{min-height:var(--tmc-min-day-height,240px);border-right:1px solid var(--color-border,#292d35);border-bottom:1px solid var(--color-border,#292d35);padding:10px;min-width:0}.day:nth-child(7n){border-right:0}.outside{opacity:.4}.dayheading{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin:0 0 12px;font-size:var(--font-size-text,14px);font-weight:600;line-height:1.4}.date{font-size:2em}.today .date{color:var(--color-primary,#ed4747)}.empty{font-size:var(--font-size-text-small,12px);color:var(--color-text-secondary,#989faf);margin:8px 0}
    .native-release{display:block;min-width:0;margin-top:var(--gap-s,8px)}
    .credit{margin:16px 0;padding:8px 10px;font-size:var(--font-size-text-small,12px);color:var(--color-text-secondary,#989faf)}
    .controls{display:flex;flex-direction:row;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;container-type:inline-size}.arrows{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) minmax(0,1fr);gap:0;align-items:stretch;height:36px;min-height:36px;width:280px;max-width:100%;flex:none}.arrows button{padding:0;border-radius:0;overflow:hidden}.arrows button:first-child{border-radius:8px 0 0 8px}.arrows button:last-child{border-radius:0 8px 8px 0}.arrow{font-size:30px;line-height:1;font-weight:500}.arrows .month-button{padding:7px 2px}.month-button{width:100%;text-align:center;font-weight:700;border-left:0;border-right:0}.selected-month,.selected-year{display:inline;white-space:nowrap}.selected-month{font-size:var(--font-size-text,14px);line-height:20px}.selected-year{font-size:var(--font-size-text,14px);line-height:20px;margin-top:0}.view-button{width:120px;height:36px;line-height:20px;padding:7px 2px;flex:none}.status{font-size:var(--font-size-text-small,12px);margin:0;overflow-wrap:anywhere}.status:not(.notice){position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    dialog{color:inherit;background:var(--color-background,#191c23);border:1px solid var(--color-border,#414650);border-radius:18px;padding:20px;width:min(360px,calc(100vw - 32px));box-shadow:0 20px 80px #0009;position:fixed;top:16px;right:auto;bottom:auto;left:16px;margin:0;max-height:calc(100dvh - 32px);overflow:auto}dialog::backdrop{background:#0008;backdrop-filter:blur(3px)}.year-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:center;text-align:center;margin-bottom:16px}.picker-year{font-size:24px;font-weight:700}.year-controls button{font-size:30px;width:100%;line-height:1;padding:0}.year-controls button,.picker-footer button{height:36px}.months{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.months button{padding:12px 4px;border:1px solid transparent;background:var(--color-background-secondary,#262a33);font-weight:500}.months button[aria-pressed=true]{border-color:var(--color-primary,#e74747);background:color-mix(in srgb,var(--color-primary,#e74747) 18%,#262a33);color:var(--color-text-primary,#fff);font-weight:700}.picker-footer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:18px;gap:8px}.picker-footer button{width:100%;padding:8px 4px}.picker-footer button:last-child{grid-column:3}[hidden]{display:none!important}
    .controls{flex-wrap:nowrap;justify-content:space-between;min-height:40px;gap:var(--gap-xs,8px)}.view-button{width:auto;height:40px;white-space:nowrap;padding:0;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;filter:none}.view-button:hover,.view-button:focus-visible{color:var(--color-link-active,var(--purple-400,#a875ed));background:transparent;filter:none}.arrows{display:flex;width:auto;height:40px;gap:var(--gap-xs,8px);margin-left:auto;align-items:center;flex-shrink:1}.arrows button,.arrows button:first-child,.arrows button:last-child{border:0;background:transparent;border-radius:var(--border-radius-m,8px);height:32px;padding:4px 8px;color:var(--color-foreground,inherit)}.arrows button:hover{background:var(--color-background-default,#363943);color:var(--color-foreground-default,inherit);filter:none}.arrows .month-button{width:auto;padding:4px 8px;font-weight:400}.selected-month,.selected-year{font-size:var(--font-size-text,14px);line-height:20px}.arrow{font-size:24px}.controls .notice{white-space:normal}@media(max-width:600px){.controls{gap:4px}.view-button{font-size:12px}.arrows{gap:0}.arrows .month-button{padding:4px}.selected-month,.selected-year{font-size:12px}}
    .monthly-controls{display:block;position:relative;height:48px;min-height:48px;padding:8px 0;pointer-events:none}.monthly-controls button{pointer-events:auto;position:relative;z-index:1}.monthly-controls .view-button{position:absolute;left:0;top:8px;height:32px;display:flex;align-items:center}.monthly-controls .month-nav{position:absolute;left:50%;top:8px;transform:translateX(-50%);display:grid;grid-template-columns:1fr 24px 1fr;width:330px;max-width:50%;margin:0;gap:0;height:32px;min-height:32px;align-items:center;pointer-events:none}.monthly-controls .month-nav button{background:transparent;border:0;color:inherit;font-size:inherit;line-height:20px;padding:0;height:32px;min-height:32px;white-space:nowrap;display:flex;align-items:center}.monthly-controls .month-nav button:first-child{justify-content:flex-end}.monthly-controls .month-nav button:last-child{justify-content:flex-start}.monthly-controls button:hover,.monthly-controls button:focus-visible{color:var(--color-link-active,#a875ed);filter:none;background:transparent}.day-month{display:inline-flex;align-items:center;justify-content:center;width:14px;height:28px;margin-right:-3px;flex:none;transform:rotate(-90deg);font-size:12px;font-weight:500;line-height:1}.dayheading{align-items:center}@media(max-width:600px){.monthly-controls .view-button{font-size:10px}.monthly-controls .month-nav{max-width:50%;width:220px;grid-template-columns:1fr 12px 1fr}.monthly-controls .month-nav button{font-size:11px}}
    .monthly-controls .reset-month{position:absolute;right:0;top:8px;height:32px;display:flex;align-items:center;border:0;background:transparent;padding:0;line-height:20px;color:inherit}.monthly-controls .reset-month:hover,.monthly-controls .reset-month:focus-visible{color:var(--color-link-active,#a875ed)}
    .monthly-controls .view-button,.monthly-controls .reset-month,.monthly-controls .month-nav{background:color-mix(in srgb,var(--color-background-navbar,var(--color-background,#191c23)) 75%,transparent)!important;backdrop-filter:blur(var(--ni-10,10px));border-radius:var(--border-radius-m,8px)}.monthly-controls .view-button,.monthly-controls .reset-month{padding-inline:12px}.monthly-controls .month-nav{padding-inline:12px}
    .monthly-controls .view-button,.monthly-controls .reset-month{height:24px;top:12px;padding-inline:5px;border-radius:var(--border-radius-s,5px)}.monthly-controls .month-nav{height:24px;min-height:24px;top:12px;width:330px;max-width:50%;grid-template-columns:1fr 24px 1fr;padding:0;background:transparent!important;backdrop-filter:none}.monthly-controls .month-nav button{height:24px;min-height:24px;padding:0 5px;border-radius:var(--border-radius-s,5px);background:color-mix(in srgb,var(--color-background-navbar,var(--color-background,#191c23)) 75%,transparent)!important;backdrop-filter:blur(var(--ni-10,10px))}
    .monthly-controls .month-nav button{width:max-content}.monthly-controls .month-nav button:first-child{justify-self:end}.monthly-controls .month-nav button:last-child{justify-self:start}
    @container(max-width:80px){.selected-month,.selected-year{font-size:9px;letter-spacing:-.3px}.view-button{font-size:var(--font-size-tag,10px);overflow-wrap:anywhere}.arrows .arrow{font-size:22px}}
    @media(max-width:900px){.day{padding:6px}.dayheading{font-size:var(--font-size-text,14px)}}@media(max-width:600px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.outside{display:none}.day:nth-child(7n){border-right:1px solid var(--color-border,#292d35)}}
  `;
  class MonthSession {
    constructor(source, month, snapshot) {
      this.source = source;
      this.month = C.monthStart(month || new Date());
      this.pageUrl=calendarPageUrl(location.href);
      this.locale = document.documentElement.lang || navigator.language || 'en';
      // Coverage is reusable only while the actual native periods still exist.
      // A route transition or native week replacement invalidates it, even if
      // the old month had finished loading.
      const periods=Array.from(source.querySelectorAll('.trakt-calendar-items'));
      const reusable=snapshot && snapshot.source===source && calendarPageUrl(snapshot.url)===this.pageUrl && C.key(snapshot.month)===C.key(this.month) && snapshot.periods.length>0 && snapshot.periods.every((period,i)=>period===periods[i]);
      this.firstWeek = reusable?snapshot.firstWeek:null;
      this.weekReference = new Date();
      this.confirmed = reusable?snapshot.confirmed:null;
      this.nativeCards=new Map();
      this.dayCells=new Map();
      this.nativeSlotSequence=0;
      this.loadedDays=new Set(reusable?snapshot.loadedDays||[]:[]);
      this.preparingMonth=false;
      this.confirmedRanges=reusable?snapshot.ranges.slice():[];
      this.complete=reusable && snapshot.complete;
      this.generation = 0;
      this.busy = !this.complete;
      this.originalAria = source.getAttribute('aria-hidden');
      this.originalInert = source.inert;
      this.originalScroll = window.scrollY;
      this.originalScrollbarWidth = document.documentElement.style.getPropertyValue('--tmc-native-scrollbar-width');
      this.originalScrollbarPriority = document.documentElement.style.getPropertyPriority('--tmc-native-scrollbar-width');
      document.documentElement.style.setProperty('--tmc-native-scrollbar-width',Math.max(0,innerWidth-(document.documentElement.clientWidth||innerWidth))+'px');
      this.originalNavbarScrollbarWidth = document.documentElement.style.getPropertyValue('--tmc-navbar-scrollbar-width');
      this.originalNavbarScrollbarPriority = document.documentElement.style.getPropertyPriority('--tmc-navbar-scrollbar-width');
      this.originalNavbarClip = document.documentElement.style.getPropertyValue('--tmc-navbar-scrollbar-clip');
      this.originalNavbarClipPriority = document.documentElement.style.getPropertyPriority('--tmc-navbar-scrollbar-clip');
      const navbar=document.querySelector('.trakt-navbar-actions')||document.documentElement;
      document.documentElement.style.setProperty('--tmc-navbar-scrollbar-width',getComputedStyle(navbar).getPropertyValue('--scrollbar-width').trim()||'0px');
      this.host = element('div');
      this.host.id = 'trakt-month-calendar';
      this.host.dataset.build='1.0.1-shadow-scroll';
      const shadow = this.host.attachShadow({mode:'open'});
      shadow.append(element('style', css));
      this.scroller=element('div',undefined,'month-viewport');
      this.scroller.id='tmc-month-viewport';
      this.scroller.tabIndex=0;
      this.scroller.setAttribute('role','region');
      this.scroller.setAttribute('aria-label','Scrollable monthly calendar');
      shadow.append(this.scroller);
      this.shell = element('section', undefined, 'shell');
      this.shell.setAttribute('aria-label', 'Trakt monthly calendar');
      unpinOriginalNavigation(source);source.classList.remove('tmc-original-calendar');
      this.controlsHost = element('div');
      this.controlsHost.id = 'trakt-month-controls';
      this.controlsHost.style.cssText='width:100%;min-width:0;flex-shrink:0';
      const controlsShadow=this.controlsHost.attachShadow({mode:'open'});
      controlsShadow.append(element('style',css));
      const controls=element('nav',undefined,'controls monthly-controls');
      this.controls=controls;
      controls.setAttribute('aria-label','Monthly calendar controls');
      this.monthButton=this.button('', 'Choose Calendar Month',()=>this.openMonthPicker(),'month-button');
      this.monthButton.setAttribute('aria-haspopup','dialog');
      this.monthButton.setAttribute('aria-controls','tmc-month-picker');
      this.monthDialog=element('dialog');this.monthDialog.id='tmc-month-picker';
      this.monthDialog.setAttribute('aria-label','Choose Calendar Month');
      const yearControls=element('div',undefined,'year-controls');
      this.pickerYear=element('span',undefined,'picker-year');
      yearControls.append(this.button('‹','Previous Year',()=>{this.selectionYear--;this.renderMonthPicker()}),this.pickerYear,this.button('›','Next Year',()=>{this.selectionYear++;this.renderMonthPicker()}));
      this.monthChoices=element('div',undefined,'months');
      const pickerFooter=element('div',undefined,'picker-footer');
      pickerFooter.append(this.button('This Month','Select Current Month',()=>{this.monthDialog.close();this.navigate(C.monthStart(new Date()))}),this.button('Close','Close Month Picker',()=>this.monthDialog.close()));
      this.monthDialog.append(yearControls,this.monthChoices,pickerFooter);
      this.monthDialog.addEventListener('click',event=>{if(event.target!==this.monthDialog)return;const r=this.monthDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)this.monthDialog.close()});
      const arrows=element('div',undefined,'arrows month-nav');
      this.previousMonthButton=this.button('','Previous month',()=>this.navigate(C.shiftMonth(this.month,-1)),'adjacent-month');
      this.nextMonthButton=this.button('','Next month',()=>this.navigate(C.shiftMonth(this.month,1)),'adjacent-month');
      arrows.append(this.previousMonthButton,element('span',undefined,'month-gap'),this.nextMonthButton);
      this.status=element('p','Preparing monthly calendar…','status');this.status.setAttribute('role','status');
      this.retry=this.button('Load Month','Load remaining month entries',()=>{
        this.fill(true);
      });
      controls.append(this.button('Switch to Original View','Return to Trakt’s original calendar',()=>{
        rememberedSnapshot=this.snapshotState();
        bypassUrl=location.href;rememberedMonth=this.month;this.destroy();session=null;
        window.scrollTo(0,this.originalScroll);installReturnButton(this.source);
      },'view-button'),arrows,this.button('Jump to Current Week','Jump to Current Week',()=>this.jumpToCurrentWeek(),'reset-month'),this.status,this.retry);
      controlsShadow.append(controls,this.monthDialog);
      this.calendar=element('div',undefined,'calendar');
      const footerSlot=element('slot');footerSlot.name='site-footer';
      document.body.append(this.controlsHost);
      this.shell.append(this.calendar,element('p','Trakt Month Calendar v'+VERSION+' by eqagunn','credit'),footerSlot);this.scroller.append(this.shell);
      const sourceStyle=getComputedStyle(source);
      const nativeNavigation=source.querySelector('.calendar-navigation');
      this.controlsHost.style.position='fixed';
      this.controlsHost.style.zIndex='calc(var(--layer-overlay,777) + 1)';
      this.controlsHost.style.pointerEvents='none';
      this.controlsHost.style.fontFamily=sourceStyle.fontFamily;
      this.baseMarginLeft=parseFloat(sourceStyle.marginLeft)||0;
      this.baseMarginRight=parseFloat(sourceStyle.marginRight)||0;
      this.host.style.marginTop=sourceStyle.marginTop;
      this.host.style.marginBottom=sourceStyle.marginBottom;
      this.host.style.fontFamily=sourceStyle.fontFamily;
      source.before(this.host);
      this.host.classList.add('tmc-month-scroll');
      source.classList.add('tmc-native-source');source.setAttribute('aria-hidden','true');source.inert=true;
      this.position=()=>{
        const parent=this.host.parentElement.getBoundingClientRect();
        const viewport=document.documentElement.clientWidth||innerWidth;
        const sidebars=Array.from(document.querySelectorAll('.trakt-side-navbar')).filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden');
        const parentStyle=getComputedStyle(this.host.parentElement);
        const contentLeft=parent.left+(parseFloat(parentStyle.paddingLeft)||0);
        const contentRight=parent.right-(parseFloat(parentStyle.paddingRight)||0);
        let left=Math.max(12,contentLeft+this.baseMarginLeft);
        for(const sidebar of sidebars){const r=sidebar.getBoundingClientRect();if(r.width>0&&r.height>innerHeight*.3&&r.left<viewport*.4)left=Math.max(left,r.right+12)}
        left=Math.min(left,viewport-13);
        const right=Math.min(viewport-12,contentRight-this.baseMarginRight);
        this.host.style.marginLeft='0px';
        this.host.style.width=Math.max(1,viewport-left)+'px';
        this.shell.style.width=Math.max(1,right-left)+'px';
        this.shell.style.maxWidth='100%';
        {
          const bars=Array.from(document.querySelectorAll('.trakt-navbar-actions,.trakt-navbar,header')).map(node=>node.getBoundingClientRect()).filter(r=>r.height>0&&r.top>=0&&r.bottom<innerHeight*.5);
          // Derive spacing from visible fixed chrome, never a hidden/sticky source or document scroll.
          const controlsHeight=48;
          const fallbackTop=Math.max(16,...bars.map(r=>r.bottom+8))+controlsHeight;

          this.host.style.left=left+'px';this.host.style.top='0px';
          this.host.style.height=innerHeight+'px';this.host.style.maxHeight=innerHeight+'px';
          const monthGutter=this.scroller.offsetWidth-this.scroller.clientWidth||16;
          const nativeGutter=parseFloat(document.documentElement.style.getPropertyValue('--tmc-native-scrollbar-width'))||0;
          document.documentElement.style.setProperty('--tmc-navbar-scrollbar-clip',Math.max(0,monthGutter-nativeGutter)+'px');
          this.controlsHost.style.left=left+'px';
          const upper=document.querySelector('.svelte-9b8fk1');
          const lower=this.source.querySelector('.svelte-y0esg')||nativeNavigation;
          const upperRect=upper?.getBoundingClientRect(),lowerRect=lower?.getBoundingClientRect();
          const layoutKey=new URL(this.pageUrl).pathname.replace(/\/$/,'');
          const savedLayout=calendarLayouts.get(layoutKey);
          if(this.controlsTop==null && savedLayout){this.controlsTop=savedLayout.controlsTop;this.previewTop=savedLayout.gridTop}
          // Retain each section's resting layout independently of later native scrolling.
          if(this.controlsTop==null){
            const gapTop=upperRect?.bottom??Math.max(0,...bars.map(r=>r.bottom));
            const gapBottom=lowerRect && lowerRect.height>0?lowerRect.top:fallbackTop;
            this.previewTop=Math.max(0,gapBottom);
            this.controlsTop=gapBottom>=gapTop?gapTop+(gapBottom-gapTop-controlsHeight)/2:gapTop;
            calendarLayouts.set(layoutKey,{controlsTop:this.controlsTop,gridTop:this.previewTop});
          }
          const calendarLayout=calendarLayouts.get('/calendar');
          if(calendarLayout && layoutKey==='/discover/releases')this.controlsTop=calendarLayout.controlsTop;
          const top=this.previewTop;
          this.controlsHost.style.top=Math.max(0,this.controlsTop)+'px';
          this.controlsHost.style.width=Math.max(1,right-left)+'px';
          controlsPlacement={left:this.controlsHost.style.left,top:this.controlsHost.style.top,width:this.controlsHost.style.width};
          this.shell.style.paddingTop=top+'px';
        }
        this.compact=false;this.updateMonthLabel();
        this.syncFooter();
        this.sizeDays();
        this.updateCenter();
      };
      this.position();window.addEventListener('resize',this.position);
      this.layoutTimer=setInterval(this.position,250);
      if(typeof ResizeObserver!=='undefined'){
        this.resizeObserver=new ResizeObserver(this.position);
        for(const node of [source.parentElement,...document.querySelectorAll('.trakt-side-navbar')])if(node)this.resizeObserver.observe(node);
      }
      this.observer = new MutationObserver(mutations => {
        if(mutations.every(change=>change.target===this.host || (change.type==='attributes' && change.target===source)))return;
        clearTimeout(this.renderTimer);
        this.renderTimer = setTimeout(() => { if(this.valid(this.generation))this.render(); }, 100);
      });
      this.observerOptions={childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src','srcset','data-src','data-watched','data-watchlisted','data-favourited','data-rating','data-indicator','class','fill','disabled','aria-label']};
      this.observer.observe(source,this.observerOptions);
      this.observer.observe(this.host,this.observerOptions);
      this.filterHandler = event => {
        if(event.target.closest('.trakt-filter-button,.filter-button-wrapper,'+popupControls))return;
        if (event.composedPath().includes(this.host) || event.composedPath().includes(this.controlsHost) || this.source.contains(event.target) || event.target.closest('.trakt-side-navbar, dialog, [role=dialog], .trakt-modal, .trakt-drawer')) return;
        if (!event.target.closest('button,input,select,[role="option"],[role="menuitem"]')) return;
        // Restore native ownership before a filter changes the Svelte card tree.
        this.restoreNativeCards();
        clearTimeout(this.filterTimer);
        this.filterTimer = setTimeout(() => { if(this.valid(this.generation)){this.confirmed = null;this.fill();} }, 800);
      };
      document.addEventListener('click',this.filterHandler,true);
      document.addEventListener('change',this.filterHandler,true);
      this.watchCenter();
      if(reusable){this.collectNativeCards();}
      this.render();
      if(this.complete){this.setStatus('Monthly calendar ready.');}
      else this.fill(reusable);
    }
    button(text, label, action, className) {
      const b = element('button',text,className);
      b.type = 'button';
      b.setAttribute('aria-label',label);
      b.addEventListener('click',action);
      return b;
    }
    updateMonthLabel(){
      const name=this.month.toLocaleDateString(this.locale,{month:this.compact?'short':'long'});
      const year=this.month.toLocaleDateString(this.locale,{year:'numeric'});
      if(this.monthButton.dataset.label===name+'|'+year)return;
      this.monthButton.dataset.label=name+'|'+year;
      this.monthButton.replaceChildren(element('strong',name,'selected-month'));
      this.monthButton.title=name+' '+year;
      this.previousMonthButton.textContent='Previous Month';
      this.nextMonthButton.textContent='Next Month';
    }
    sizeDays(){
      const width=parseFloat(this.shell.style.width)||parseFloat(this.host.style.width)||0;
      const padding=innerWidth<=900?6:10;
      const columns=innerWidth<=600?2:7;
      const imageHeight=Math.max(0,width/columns-2*padding-1)*9/16;
      const heights=selector=>Array.from(this.calendar.querySelectorAll(selector)).map(n=>n.getBoundingClientRect().height).filter(h=>h>0);
      this.host.style.setProperty('--tmc-native-cover-height',Math.ceil(imageHeight)+'px');
      const footerHeight=parseFloat(getComputedStyle(this.host).getPropertyValue('--height-card-footer'))||40;
      this.host.style.setProperty('--tmc-native-card-height',Math.ceil(imageHeight+footerHeight)+'px');
      const headingHeight=Math.max(20,...heights('.dayheading'));
      this.host.style.setProperty('--tmc-min-day-height',Math.ceil(2*padding+headingHeight+24+imageHeight+footerHeight)+'px');
    }
    jumpToCurrentWeek(){
      const month=C.monthStart(new Date());
      if(C.key(month)!==C.key(this.month))this.navigate(month);
      this.currentWeekStarted=false;
      this.currentWeekJumpRequested=true;
      this.centerOnLoadedCurrentWeek();
    }
    centerOnLoadedCurrentWeek(){
      if(!this.currentWeekJumpRequested)return;
      const today=new Date(),monday=C.addDays(today,-((today.getDay()+6)%7));
      const sunday=C.addDays(monday,6),last=sunday>C.monthEnd(this.month)?C.monthEnd(this.month):sunday;
      if(!this.currentWeekStarted && C.key(C.monthStart(today))===C.key(this.month) && this.displayThrough>=C.key(last)){
        this.currentWeekJumpRequested=false;this.currentWeekStarted=true;this.centerOnCurrentWeek();
      }
    }
    centerOnCurrentWeek(){
      this.centerEnabled=true;
      this.centerGeometry=null;
      this.updateCenter(true);
      // The command scrolls once. Later layout updates must not fight a user
      // dragging a native scrollbar, which need not emit DOM pointer events.
      this.centerEnabled=false;
    }
    updateCenter(smooth=false){
      // ResizeObserver runs before paint; avoid deferring correction to a later frame.
      if(!this.centerEnabled)return;
      if(!this.valid(this.generation))return;
      const today=new Date();
      if(C.key(C.monthStart(today))!==C.key(this.month))return;
      const monday=C.addDays(today,-((today.getDay()+6)%7));
      const day=this.calendar.querySelector('[data-date="'+C.key(monday)+'"]')||this.calendar.querySelector('.today');
      if(!day)return;
      const rect=day.getBoundingClientRect();
      // Match the first row's resting position, regardless of this week's height.
      const start=parseFloat(this.shell.style.paddingTop)||0;
      const rowTop=this.scroller.scrollTop+rect.top-this.scroller.getBoundingClientRect().top;
      const geometry=[rowTop,start];
      if(this.centerGeometry && geometry.every((v,i)=>Math.abs(v-this.centerGeometry[i])<1))return;
      this.centerGeometry=geometry;
      const desired=rowTop-start;
      this.scroller.scrollTo({top:Math.max(0,desired),behavior:smooth?'smooth':'instant'});
      this.host.dataset.centeredWeek=C.key(monday);
    }
    watchCenter(){
      this.centerIntentHandler=event=>{
        if(event.type==='keydown' && !['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))return;
        if(event.type==='keydown' && (event.target.closest?.('input,textarea,select,[contenteditable=true]') || this.monthDialog.open))return;
        this.centerEnabled=false;
      };
      for(const type of ['wheel','touchstart','keydown','pointerdown'])window.addEventListener(type,this.centerIntentHandler,{passive:true});
      this.scroller.addEventListener('mousedown',this.centerIntentHandler,{passive:true});
      if(typeof ResizeObserver==='undefined')return;
      this.centerObserver=new ResizeObserver(()=>this.updateCenter());
      this.centerObserver.observe(this.calendar);
    }
    openMonthPicker(){
      this.selectionYear=this.month.getFullYear();this.renderMonthPicker();
      this.monthDialog.showModal();
      this.monthChoices.querySelector('[aria-pressed=true]')?.focus();
    }
    renderMonthPicker(){
      this.pickerYear.textContent=String(this.selectionYear);
      const choices=[];
      for(let month=0;month<12;month++){
        const date=new Date(this.selectionYear,month,1,12);
        const button=this.button(date.toLocaleDateString(this.locale,{month:'short'}),date.toLocaleDateString(this.locale,{month:'long',year:'numeric'}),()=>{this.monthDialog.close();this.navigate(date)});
        button.setAttribute('aria-pressed',String(this.selectionYear===this.month.getFullYear()&&month===this.month.getMonth()));
        choices.push(button);
      }
      this.monthChoices.replaceChildren(...choices);
    }
    setStatus(text, notice=false) { this.status.textContent=text;this.status.classList.toggle('notice',notice); }
    valid(token) { return this.generation === token && this.source.isConnected && this.host.isConnected && onCalendar() && calendarPageUrl(location.href)===this.pageUrl; }
    signature() {
      return this.source.querySelectorAll('.trakt-calendar-items').length + ':' + this.source.querySelectorAll('trakt-calendar-item').length + ':' + this.source.querySelector('.trakt-calendar-days')?.textContent;
    }
    async settle(token, timeout = 15000) {
      const deadline = Date.now()+timeout;
      let last = '', stable = 0;
      while (this.valid(token) && Date.now() < deadline) {
        await delay(200);
        const sig = this.signature();
        const loading = !!this.source.querySelector('.loading-wrapper');
        const periods=Array.from(this.source.querySelectorAll('.trakt-calendar-items'));
        // A period shell can arrive before its release list. An explicit empty
        // period or actual card shells must exist before its dates are resolved.
        const committed=periods.length>0 && periods.every(period=>period.querySelector('trakt-empty-calendar-period,.trakt-empty-calendar-period,trakt-calendar-item,.tmc-native-card-space'));
        stable = !loading && committed && sig === last ? stable + 1 : 0;
        last = sig;
        if (stable >= 3 && this.source.querySelectorAll('.trakt-calendar-day-button').length===7 && this.source.querySelector('.trakt-calendar-items')) return true;
      }
      return false;
    }
    async appendByScrolling(token) {
      const count=this.source.querySelectorAll('.trakt-calendar-items').length;
      // Keep native geometry and fire the same window scroll event Trakt listens
      // to. Empty or short weeks may also append via its dimension observer.
      const deadline=Date.now()+8000;
      let sawLoading=false;
      while(this.valid(token) && Date.now()<deadline){
        const bottom=Math.max(0,document.documentElement.scrollHeight-innerHeight);
        // Trakt loads beyond 50% scroll; avoid jumping to the footer at the end.
        window.scrollTo({top:Math.ceil(bottom*.6),behavior:'instant'});
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        await delay(200);
        if(!this.valid(token))return false;
        sawLoading ||= !!this.source.querySelector('.loading-wrapper');
        if(this.source.querySelectorAll('.trakt-calendar-items').length>count){
          return await this.settle(token);
        }
      }
      // Give an in-flight native request its normal timeout before falling back.
      if(sawLoading && this.source.querySelector('.loading-wrapper')){
        if(!await this.settle(token))throw Error('Trakt did not finish loading the next week.');
        return this.source.querySelectorAll('.trakt-calendar-items').length>count;
      }
      return false;
    }
    collectNativeCards(){
      if(this.preparingMonth)return;
      for(const [card,record] of this.nativeCards){
        if(!record.space.isConnected || card.parentElement!==record.wrapper){
          record.view?.remove();record.wrapper.remove();record.space.remove();this.nativeCards.delete(card);
        }
      }
      for(const anchor of this.source.querySelectorAll('.calendar-day-anchor[id]')){
        const date=C.parseDay(anchor.id);
        if(!date || C.key(date)<C.key(this.month) || date>C.monthEnd(this.month))continue;
        for(const card of anchor.querySelectorAll('trakt-calendar-item')){
          if(this.nativeCards.has(card))continue;
          const box=(card.querySelector('.trakt-card')||card).getBoundingClientRect();
          const space=element('div');space.className='tmc-native-card-space';
          space.style.cssText='width:'+Math.max(1,box.width)+'px;height:'+Math.max(1,box.height)+'px;flex:none';
          card.before(space);
          const wrapper=element('div',undefined,'tmc-native-card calendar-day-anchor');
          wrapper.dataset.date=C.key(date);wrapper.dataset.tmcDate=C.key(date);
          wrapper.slot='native-card-'+(++this.nativeSlotSequence);wrapper.id='tmc-'+wrapper.slot;
          const record={card,wrapper,space,date:C.key(date),originalSlot:card.getAttribute('slot')};
          this.nativeCards.set(card,record);wrapper.append(card);this.host.append(wrapper);
          wrapper.addEventListener('click',event=>this.nativeCardClick(event,record),true);
        }
      }
    }
    restoreNativeCards(){
      for(const {card,wrapper,space,details,linkOverrides,view} of this.nativeCards.values()){
        details?.remove();
        for(const [link,attributes] of linkOverrides||[])for(const [name,value] of Object.entries(attributes)){if(value===null)link.removeAttribute(name);else link.setAttribute(name,value)}
        if(space.isConnected)space.replaceWith(card);
        view?.remove();wrapper.remove();
      }
      this.nativeCards.clear();
    }
    nativeItem(record){
      return C.readEntries({querySelectorAll:()=>[record.wrapper]},location.origin).get(record.date)?.[0];
    }
    nativeCardClick(event,record){
      const link=event.target.closest('a[href]');
      if(!link || !record.wrapper.contains(link) || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
      const item=this.nativeItem(record);if(!item)return;
      const urls=this.nativeDrawerUrls(item);
      const target=link.classList.contains('tmc-season-link')?urls.season:
        link.classList.contains('tmc-episode-link')?urls.episode:
        link===record.card.querySelector('.trakt-card-title')?.closest('a')?urls.show:
        link.querySelector('img,.trakt-card-cover')?urls.image:null;
      if(!target)return;
      event.preventDefault();event.stopPropagation();
      const proxy=element('a');proxy.href=target;proxy.hidden=true;
      proxy.setAttribute('data-sveltekit-noscroll','');proxy.setAttribute('data-sveltekit-replacestate','');
      document.body.append(proxy);proxy.click();setTimeout(()=>proxy.remove(),0);
    }
    nativeDrawerUrls(item){
      const url=new URL(item.href),path=url.pathname.match(/\/seasons\/(\d+)\/episodes\/(\d+)/);
      const parts=item.subtitle.match(/(?:S(\d+)\s*[•·⋅\-–]?\s*E(\d+)|(\d+)\s*[x×]\s*(\d+))/i);
      const full=item.type==='show' && item.subtitle.match(/^\s*Season\s+(\d+)\b/i);
      const season=full?.[1]||path?.[1]||url.searchParams.get('season')||parts?.[1]||parts?.[3];
      const episode=path?.[2]||url.searchParams.get('episode')||parts?.[2]||parts?.[4];
      const make=view=>{const d=new URL(location.href);for(const key of ['view','glance_type','glance_slug','glance_season','glance_episode'])d.searchParams.delete(key);
        d.searchParams.set('view',view);d.searchParams.set('glance_slug',new URL(item.mediaHref).pathname.split('/')[2]);
        if(view==='glance'){d.searchParams.set('glance_type',item.type==='movie'?'movie':'show')}
        else{d.searchParams.set('glance_season',String(Number(season)));if(view==='glance-episode')d.searchParams.set('glance_episode',String(Number(episode)))}return d.href};
      const show=make('glance'),seasonUrl=season?make('glance-season'):item.mediaHref;
      const episodeUrl=season&&episode?make('glance-episode'):item.href;
      return{show,season:seasonUrl,episode:episodeUrl,image:full?seasonUrl:item.type==='show'?episodeUrl:show};
    }
    decorateNativeCard(record){
      const item=this.nativeItem(record);if(!item)return;
      const titleLink=record.card.querySelector('.trakt-card-title')?.closest('a[href]');
      if(titleLink){
        record.linkOverrides??=new Map();
        if(!record.linkOverrides.has(titleLink))record.linkOverrides.set(titleLink,{href:titleLink.getAttribute('href'),'data-sveltekit-noscroll':titleLink.getAttribute('data-sveltekit-noscroll'),'data-sveltekit-replacestate':titleLink.getAttribute('data-sveltekit-replacestate')});
        titleLink.href=this.nativeDrawerUrls(item).show;
        titleLink.setAttribute('data-sveltekit-noscroll','');titleLink.setAttribute('data-sveltekit-replacestate','');
      }
      const subtitle=record.card.querySelector('.trakt-card-subtitle');
      if(subtitle && record.subtitle!==item.subtitle){
        record.details?.remove();record.subtitle=item.subtitle;
        const detail=element('span',undefined,'tmc-native-details');detail.title=item.subtitle;
        const textStyle=getComputedStyle(subtitle);
        for(const property of ['fontFamily','fontSize','fontWeight','lineHeight'])detail.style[property]=textStyle[property];
        const parts=item.subtitle.match(/^(.*?)(S\d+)(\s*[•·⋅\-–]?\s*)(E\d+)(.*)$/i)||item.subtitle.match(/^(.*?)(\d+)(\s*[x×]\s*)(\d+)(.*)$/i);
        const urls=this.nativeDrawerUrls(item),a=(text,href,cls)=>{const link=element('a',text,cls);link.href=href;return link};
        if(/^\s*Season\s+\d+/i.test(item.subtitle))detail.append(a(item.subtitle,urls.season,'tmc-season-link'));
        else if(item.type==='show' && parts)detail.append(document.createTextNode(parts[1]),a(parts[2],urls.season,'tmc-season-link'),document.createTextNode(parts[3]),a(parts[4]+parts[5],urls.episode,'tmc-episode-link'));
        else detail.append(a(item.subtitle,urls.episode,'tmc-episode-link'));
        subtitle.after(detail);record.details=detail;
      }
    }
    async revealNativeCards(token){
      if(!this.valid(token))return;
      this.collectNativeCards();
      const range=C.coverage(this.source,this.firstWeek);
      if(range)for(let date=range.start;date<=range.end && date<=C.monthEnd(this.month);date=C.addDays(date,1)){
        this.loadedDays.add(C.key(date));
        if(!this.displayThrough || C.key(date)>this.displayThrough)this.displayThrough=C.key(date);
      }
      this.render();this.centerOnLoadedCurrentWeek();
    }
    nativeControls() {
      const buttons = Array.from(this.source.querySelectorAll('.trakt-calendar-controls button'));
      if (buttons.length !== 3) throw Error('Trakt’s calendar controls could not be recognized.');
      return { previous: buttons[0], next: buttons[2] };
    }
    weekAtTop() {
      const dates = C.toolbarDates(this.source, this.weekReference, this.locale);
      if (dates.length !== 7) throw Error('Trakt’s calendar dates could not be recognized for this language.');
      this.weekReference = dates[0];
      this.nativeWeek = dates[0];
      // ScrollSpy can show a later week when the first period is empty.
      // Recover the first period from a dated anchor and its period index.
      const periods = Array.from(this.source.querySelectorAll('.trakt-calendar-items'));
      for (let i=0;i<periods.length;i++) {
        const dated = Array.from(periods[i].querySelectorAll('.calendar-day-anchor[id]')).map(node => C.parseDay(node.id)).find(Boolean);
        if (dated) return C.addDays(dated,-((dated.getDay()-dates[0].getDay()+7)%7)-7*i);
      }
      return dates[0];
    }
    requestWeekJump(target) {
      const current=this.nativeWeek;
      const week=C.addDays(target,-((target.getDay()-current.getDay()+7)%7));
      if(Math.abs(week-current)<=7*C.dayMs)return null;
      const id=String(this.generation)+':'+C.key(week);
      let result=null;
      const receive=event=>{try{const value=JSON.parse(event.detail);if(value.id===id)result=value}catch{}};
      document.addEventListener('tmc-calendar-jump-response',receive);
      try{this.restoreNativeCards();document.dispatchEvent(new CustomEvent('tmc-calendar-jump-request',{detail:JSON.stringify({id,current:C.key(current),target:C.key(week)})}))}
      finally{document.removeEventListener('tmc-calendar-jump-response',receive)}
      if(result?.clicked)this.weekReference=result.hit?week:C.addDays(current,-7);
      return result;
    }
    navigate(date) {
      this.restoreNativeCards();
      this.currentWeekJumpRequested=false;
      this.centerEnabled=false;
      this.currentWeekStarted=false;
      delete this.host.dataset.centeredWeek;
      this.scroller.scrollTo?.({top:0,behavior:'instant'});
      this.scroller.scrollTop=0;
      this.month = C.monthStart(date);
      this.confirmed = null;
      window.scrollTo({top:0,behavior:'instant'});
      this.render();
      this.fill();
    }
    async fill(preserveKnown=false) {
      if(!preserveKnown)this.restoreNativeCards();
      const token = ++this.generation;
      this.busy = true;
      this.preparingMonth=true;
      this.displayThrough=C.key(C.addDays(this.month,-1));
      this.currentWeekStarted=false;
      this.centerEnabled=false;
      if(!preserveKnown)this.confirmed = null;
      this.complete=false;
      if(!preserveKnown){this.confirmedRanges=[];this.loadedDays.clear();}
      this.render();
      this.setStatus('Loading the month through Trakt’s existing calendar…');
      try {
        window.scrollTo({top:0,behavior:'instant'});
        if (!await this.settle(token)) throw Error('Trakt did not finish loading its calendar.');
        if (!this.valid(token)) return;
        this.firstWeek = this.weekAtTop();
        const target = C.monthStart(this.month);
        const coverage=C.coverage(this.source,this.firstWeek);
        const jump=coverage && coverage.start<=target && coverage.end>=target?null:this.requestWeekJump(target);
        if(jump?.clicked){
          if(!await this.settle(token))throw Error('Trakt did not finish loading the selected week.');
          if(!this.valid(token))return;
          window.scrollTo({top:0,behavior:'instant'});await delay(250);
          if(!this.valid(token))return;
          this.firstWeek=this.weekAtTop();
        }
        let steps = 0;
        const maxSteps=Math.ceil(Math.abs(this.firstWeek-target)/C.dayMs/7)+12;
        while (this.firstWeek > target || (C.coverage(this.source,this.firstWeek)?.end || C.addDays(this.firstWeek,6)) < target) {
          if (++steps > maxSteps) throw Error('Trakt’s calendar navigation could not reach the requested month.');
          const forward = C.addDays(this.firstWeek,6) < target;
          const oldWeek = C.key(this.firstWeek);
          const controls = this.nativeControls();
          const button = forward ? controls.next : controls.previous;
          if (button.disabled) throw Error('Trakt disabled navigation to that week.');
          this.weekReference = C.addDays(this.nativeWeek,forward?7:-7);
          this.restoreNativeCards();button.click();
          if (!await this.settle(token)) throw Error('Trakt did not finish loading the requested week.');
          if (!this.valid(token)) return;
          window.scrollTo({top:0,behavior:'instant'});
          await delay(250);
          if (!this.valid(token)) return;
          this.firstWeek = this.weekAtTop();
          if (C.key(this.firstWeek) === oldWeek) throw Error('Trakt’s week navigation did not advance.');
          this.setStatus('Moving to ' + this.month.toLocaleDateString(this.locale,{month:'long',year:'numeric'}) + '…');
        }
        this.preparingMonth=false;
        if(!preserveKnown)this.confirmedRanges=[];
        await this.revealNativeCards(token);
        if(!this.valid(token))return;
        this.captureWeek();
        this.render();
        let attempts=0;
        while(!this.confirmed || this.confirmed.end<C.monthEnd(this.month)){
          if(++attempts>9)throw Error('Trakt did not provide all weeks of the month.');
          this.setStatus('Loading the next week through Trakt’s scrolling loader…');
          // Next replaces the entire native accumulator. It cannot retain real
          // cards or their Svelte actions, so a stalled append must be retried
          // instead of deleting earlier weeks and substituting copied cards.
          if(!await this.appendByScrolling(token)){
            if(!this.valid(token))return;
            // Trakt stops auto-loading after five consecutive empty periods.
            // Advancing an entirely empty range is safe: no card ownership or
            // action handlers need to survive a native accumulator replacement.
            if(this.nativeCards.size)throw Error('Trakt did not append the next week.');
            const nextWeek=C.addDays(this.confirmed.end,1);
            window.scrollTo({top:0,behavior:'instant'});
            this.weekAtTop();
            const jump=this.requestWeekJump(nextWeek);
            if(!jump?.clicked){this.weekReference=C.addDays(this.nativeWeek,7);this.nativeControls().next.click();}
            if(!await this.settle(token))throw Error('Trakt did not finish loading the next week.');
            if(!this.valid(token))return;
            this.firstWeek=this.weekAtTop();
          }
          if(!this.valid(token))return;
          await this.revealNativeCards(token);
          if(!this.valid(token))return;
          this.captureWeek();this.render();
        }
        if (!this.valid(token)) return;
        window.scrollTo({top:0,behavior:'instant'});

        this.setStatus('Monthly calendar ready.');this.complete=true;
      } catch (error) {
        if(this.valid(token)){
          const count=this.nativeCards.size;
          if(!count){
            const source=this.source;
            bypassUrl=location.href;rememberedMonth=this.month;
            this.destroy();session=null;window.scrollTo(0,this.originalScroll);
            installReturnButton(source,'Month view could not load. Original calendar restored. '+error.message);
          }else this.setStatus(error.message+' Use “Load month” to retry.',true);
        }
      } finally {
        if (this.valid(token)) { this.busy = false; this.render();this.centerOnLoadedCurrentWeek(); }
      }
    }
    captureWeek(){
      const range=C.coverage(this.source,this.firstWeek);
      if(range){
        this.confirmedRanges.push(range);
        const sorted=this.confirmedRanges.slice().sort((a,b)=>a.start-b.start);
        let start=sorted[0].start,end=sorted[0].end;
        for(const next of sorted.slice(1)){
          if(next.start>C.addDays(end,1))break;
          if(next.end>end)end=next.end;
        }
        this.confirmed={start,end};
      }
    }
    render() {
      if (!this.host.isConnected) return;
      const monthScroll=this.scroller.scrollTop;
      this.updateMonthLabel();
      this.host.dataset.state=this.busy?'loading':this.complete?'ready':'partial';
      this.host.classList.add('tmc-month-scroll');
      document.documentElement.classList.add('tmc-month-active');
      document.documentElement.classList.toggle('tmc-calendar-loading',this.busy);
      this.source.classList.toggle('tmc-native-parked',!this.busy);
      this.position();
      this.retry.hidden = this.busy || this.complete;
      this.collectNativeCards();
      const monthKey=C.key(this.month);
      if(this.gridMonth!==monthKey){
        this.gridMonth=monthKey;this.dayCells.clear();
        const grid=element('div',undefined,'grid');
        for(const date of C.monthCells(this.month)){
          const key=C.key(date),outside=date.getMonth()!==this.month.getMonth();
          const today=key===C.key(new Date());
          const cell=element('section',undefined,'day'+(outside?' outside':'')+(today?' today':''));
          cell.dataset.date=key;
          cell.setAttribute('aria-label',date.toLocaleDateString(this.locale,{dateStyle:'full'}));
          const heading=element('h3',undefined,'dayheading');
          const number=element('span',String(date.getDate()).padStart(2,'0'),'date');
          if(today)number.setAttribute('aria-label',`Today, ${date.getDate()}`);
          heading.append(element('span',date.toLocaleDateString('en',{month:'short'}).toUpperCase(),'day-month'),number,element('span',date.toLocaleDateString(this.locale,{weekday:'long'}),'dayname'));
          cell.append(heading);
          this.dayCells.set(key,{cell,date,outside,empty:element('p',undefined,'empty')});
          grid.append(cell);
        }
        this.calendar.replaceChildren(grid);
      }
      const cardsByDay=new Map();
      for(const record of this.nativeCards.values()){
        this.decorateNativeCard(record);
        if(!record.view){
          record.view=element('div',undefined,'native-release');
          const slot=element('slot');slot.name=record.wrapper.slot;
          record.view.append(slot);
        }
        const day=this.dayCells.get(record.date);
        if(day && record.view.parentElement!==day.cell)day.cell.append(record.view);
        cardsByDay.set(record.date,(cardsByDay.get(record.date)||0)+1);
      }
      for(const [key,day] of this.dayCells){
        if(day.outside || cardsByDay.has(key)){day.empty.remove();continue;}
        const resolved=!this.preparingMonth && this.loadedDays.has(key);
        const text=resolved?'No releases':this.busy?'Loading…':'Not loaded';
        if(day.empty.textContent!==text)day.empty.textContent=text;
        if(day.empty.parentElement!==day.cell)day.cell.append(day.empty);
      }
      this.calendar.style.visibility='visible';
      this.syncFooter();this.sizeDays();
      if(!this.centerEnabled && this.scroller.scrollTop!==monthScroll)this.scroller.scrollTop=monthScroll;
      this.updateCenter();
    }
    syncFooter(){
      if(this.busy)return;
      const footer=document.querySelector('.trakt-footer');
      if(!footer || footer===this.nativeFooter)return;
      this.footerPosition=document.createComment('Trakt footer position');
      footer.before(this.footerPosition);this.nativeFooter=footer;
      const scroll=this.scroller.scrollTop;
      this.footerSlotAttribute=footer.getAttribute('slot');footer.slot='site-footer';this.host.append(footer);if(!this.centerEnabled && this.scroller.scrollTop!==scroll)this.scroller.scrollTop=scroll;
    }
    snapshotState(){
      return{source:this.source,periods:Array.from(this.source.querySelectorAll('.trakt-calendar-items')),url:this.pageUrl,month:this.month,firstWeek:this.firstWeek,ranges:this.confirmedRanges.slice(),confirmed:this.confirmed,complete:!!this.complete,loadedDays:new Set(this.loadedDays)};
    }
    destroy() {
      document.documentElement.classList.remove('tmc-calendar-loading','tmc-month-active');
      if(this.originalScrollbarWidth)document.documentElement.style.setProperty('--tmc-native-scrollbar-width',this.originalScrollbarWidth,this.originalScrollbarPriority);
      else document.documentElement.style.removeProperty('--tmc-native-scrollbar-width');
      if(this.originalNavbarScrollbarWidth)document.documentElement.style.setProperty('--tmc-navbar-scrollbar-width',this.originalNavbarScrollbarWidth,this.originalNavbarScrollbarPriority);
      else document.documentElement.style.removeProperty('--tmc-navbar-scrollbar-width');
      if(this.originalNavbarClip)document.documentElement.style.setProperty('--tmc-navbar-scrollbar-clip',this.originalNavbarClip,this.originalNavbarClipPriority);
      else document.documentElement.style.removeProperty('--tmc-navbar-scrollbar-clip');
      this.generation++;
      clearTimeout(this.renderTimer);
      clearTimeout(this.filterTimer);
      clearInterval(this.layoutTimer);
      this.resizeObserver?.disconnect();this.centerObserver?.disconnect();
      for(const type of ['wheel','touchstart','keydown','pointerdown'])window.removeEventListener(type,this.centerIntentHandler);
      this.scroller.removeEventListener('mousedown',this.centerIntentHandler);
      this.observer.disconnect();this.restoreNativeCards();
      window.removeEventListener('resize',this.position);
      document.removeEventListener('click',this.filterHandler,true);
      document.removeEventListener('change',this.filterHandler,true);
      this.source.classList.remove('tmc-native-source','tmc-native-parked');
      this.source.inert = this.originalInert;
      if (this.originalAria === null) this.source.removeAttribute('aria-hidden');
      else this.source.setAttribute('aria-hidden',this.originalAria);
      if(this.monthDialog.open)this.monthDialog.close();
      if(this.nativeFooter){if(this.footerPosition?.isConnected)this.footerPosition.replaceWith(this.nativeFooter);if(this.footerSlotAttribute===null)this.nativeFooter.removeAttribute('slot');else this.nativeFooter.setAttribute('slot',this.footerSlotAttribute)}
      this.controlsHost.remove();this.host.remove();
    }
  }
  function removeReturnHost(){
    returnHost?.remove();returnHost=null;unpinOriginalNavigation();
    document.querySelectorAll('.tmc-original-calendar').forEach(source=>source.classList.remove('tmc-original-calendar'));
  }
  function installReturnButton(source,notice) {
    pinOriginalNavigation(source);
    if(returnHost?.isConnected) return;
    returnHost=element('div');returnHost.id='trakt-month-return';
    const shadow=returnHost.attachShadow({mode:'open'});
    shadow.append(element('style',css));
    const controls=element('nav',undefined,'controls monthly-controls');
    const button=element('button','Switch to Month View','view-button');
    button.type='button';button.setAttribute('aria-label','Switch to monthly calendar');
    button.addEventListener('click',()=>{
      const snapshot=rememberedSnapshot;rememberedSnapshot=null;
      removeReturnHost();bypassUrl=null;
      session=new MonthSession(source,rememberedMonth,snapshot);
    });
    controls.append(button);shadow.append(controls);
    if(notice){const status=element('p',notice,'status notice');status.setAttribute('role','status');controls.append(status)}
    const rect=source.getBoundingClientRect();
    const placement=controlsPlacement||{left:rect.left+'px',top:Math.max(0,rect.top+scrollY-48)+'px',width:rect.width+'px'};
    returnHost.style.cssText='position:fixed;z-index:calc(var(--layer-overlay,777) + 1);pointer-events:none;min-width:0';
    Object.assign(returnHost.style,placement);returnHost.style.fontFamily=getComputedStyle(source).fontFamily;
    document.body.append(returnHost);


  }
  function reconcile() {
    if (location.href !== lastUrl && calendarPageUrl(location.href)===calendarPageUrl(lastUrl)){lastUrl=location.href}
    if (location.href !== lastUrl) {
      const routeChanged=new URL(location.href).pathname!==new URL(lastUrl).pathname;
      lastUrl = location.href;
      bypassUrl = null;
      rememberedMonth=null;rememberedSnapshot=null;
      // Section navigation replaces CalendarLayout. Filter URLs can update the
      // existing layout, so they must not wait for a different source node.
      retiringSource=routeChanged?(session?.source || document.querySelector('.tmc-original-calendar')):null;
      removeReturnHost();
      if (session) { session.destroy(); session = null; }
    }
    if (session && (!onCalendar() || !session.source.isConnected)) { session.destroy(); session = null; }
    if (!session && onCalendar() && location.href !== bypassUrl) {
      const source = document.querySelector('.trakt-calendar-layout');
      if(source && source!==retiringSource){
        retiringSource=null;
        try{session=new MonthSession(source)}catch(error){
          source.classList.remove('tmc-native-source','tmc-native-parked');
          source.inert=false;source.removeAttribute('aria-hidden');
          document.getElementById('trakt-month-calendar')?.remove();
          document.getElementById('trakt-month-controls')?.remove();
          bypassUrl=location.href;installReturnButton(source,'Month view could not start. Original calendar restored. '+error.message);
        }
      }
    }
    if(!session && onCalendar() && location.href===bypassUrl) {
      const source=document.querySelector('.trakt-calendar-layout');
      if(source) installReturnButton(source);
    }
  }
  // During Original View, keep the saved month only while its filters remain
  // unchanged. Native week navigation and scrolling can reuse the same month.
  const invalidateSnapshot=event=>{
    if(session || event.composedPath().includes(returnHost))return;
    const target=event.target;
    if(target.closest('.trakt-filter-button,.filter-button-wrapper,'+popupControls))return;
    if(target.closest('.trakt-calendar-controls,.trakt-calendar-days,.trakt-side-navbar'))return;
    if(target.closest('button,input,select,[role="option"],[role="menuitem"]')){rememberedSnapshot=null;}
  };
  document.addEventListener('click',invalidateSnapshot,true);
  document.addEventListener('change',invalidateSnapshot,true);
  // Content scripts also run on non-calendar pages to handle Svelte SPA navigation.
  new MutationObserver(reconcile).observe(document,{childList:true,subtree:true});
  setInterval(reconcile,500);
  reconcile();
})();
