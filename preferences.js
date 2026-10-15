(function () {
  'use strict';
  const defaults=Object.freeze({calendarMonthAuto:true,calendarWeekAuto:true,releasesMonthAuto:true,releasesWeekAuto:true});
  const api=globalThis.browser?.storage?globalThis.browser:globalThis.chrome;
  const normalize=values=>Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,typeof values?.[key]==='boolean'?values[key]:fallback]));
  globalThis.TraktMonthPreferences=Object.freeze({
    defaults,
    async load(){return normalize(api?.storage?.local?await api.storage.local.get(Object.keys(defaults)):defaults)},
    async save(key,value){
      if(!Object.hasOwn(defaults,key)||typeof value!=='boolean')throw Error('Invalid preference');
      if(!api?.storage?.local)throw Error('Extension settings are unavailable');
      await api.storage.local.set({[key]:value});
    },
    subscribe(listener){
      if(!api?.storage?.onChanged)return()=>{};
      const changed=(changes,area)=>{
        if(area!=='local')return;
        const values={};
        for(const key of Object.keys(defaults))if(Object.hasOwn(changes,key)){
          const value=typeof changes[key].newValue==='boolean'?changes[key].newValue:defaults[key];
          if(value!==changes[key].oldValue)values[key]=value;
        }
        if(Object.keys(values).length)listener(values);
      };
      api.storage.onChanged.addListener(changed);
      return()=>api.storage.onChanged.removeListener(changed);
    }
  });
})();
