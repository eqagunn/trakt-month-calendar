(async function () {
  'use strict';
  const settings=globalThis.TraktMonthPreferences;
  const form=document.getElementById('preferences'),status=document.getElementById('status');
  let values,pending=0;
  const show=()=>{for(const [key,value] of Object.entries(values))form.querySelector('input[name="'+key+'"][value="'+(value?'auto':'manual')+'"]').checked=true};
  try{
    const changedDuringLoad={};
    settings.subscribe(changes=>{Object.assign(changedDuringLoad,changes);if(values){Object.assign(values,changes);show()}});
    values={...await settings.load(),...changedDuringLoad};show();
    for(const group of form.querySelectorAll('fieldset'))group.disabled=false;
    status.textContent='Settings apply to open Trakt tabs.';
  }catch{status.textContent='Could not read settings. Reopen the popup to retry.';status.classList.add('error');return}
  form.addEventListener('change',async event=>{
    const input=event.target;if(!input.matches('input[type="radio"]'))return;
    const previous=values[input.name],value=input.value==='auto';
    const choices=input.closest('.choices').querySelectorAll('input');for(const choice of choices)choice.disabled=true;
    values[input.name]=value;pending++;status.classList.remove('error');status.textContent='Saving…';
    try{await settings.save(input.name,value);if(!--pending)status.textContent='Saved.'}
    catch{pending--;values[input.name]=previous;show();status.textContent='Could not save settings. Try again.';status.classList.add('error')}
    finally{for(const choice of choices)choice.disabled=false;}
  });
})();
