/* Runs in Trakt's page world. No requests, credentials or stored state. */
(() => {
  'use strict';
  const requestEvent='tmc-calendar-jump-request',responseEvent='tmc-calendar-jump-response';
  let jumping=false;
  const parse=value=>{
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if(!match)return null;
    const date=new Date(+match[1],+match[2]-1,+match[3]);
    return date.getFullYear()===+match[1] && date.getMonth()===+match[2]-1 && date.getDate()===+match[3]?date:null;
  };
  document.addEventListener(requestEvent,event=>{
    if(jumping || !/^\/(?:calendar|discover\/releases)\/?$/.test(location.pathname))return;
    let request;
    try{request=JSON.parse(event.detail)}catch{return}
    const current=parse(request.current),target=parse(request.target);
    if(!current || !target || current.getDay()!==target.getDay())return;
    const previous=document.querySelector('.trakt-calendar-layout .trakt-calendar-controls button');
    if(!previous || previous.disabled)return;
    const original=Date.prototype.setDate;
    let hit=false,error=false;
    jumping=true;
    try{
      // Redirect only the first matching subtraction of one week, during this
      // synchronous native click. Native navigation clears its own accumulator.
      Date.prototype.setDate=function(value){
        if(!hit && this.getFullYear()===current.getFullYear() && this.getMonth()===current.getMonth() && this.getDate()===current.getDate() && Number(value)===this.getDate()-7){
          hit=true;return this.setTime(target.getTime());
        }
        return original.call(this,value);
      };
      previous.click();
    }catch{error=true}
    finally{Date.prototype.setDate=original;jumping=false}
    document.dispatchEvent(new CustomEvent(responseEvent,{detail:JSON.stringify({id:request.id,clicked:true,hit:hit&&!error})}));
  });
})();
