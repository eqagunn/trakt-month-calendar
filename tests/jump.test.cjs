const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../calendar-jump.js'),'utf8');
class DetailEvent extends Event{constructor(type,options){super(type);this.detail=options.detail}}
function setup(action,pathname="/calendar"){
 const document=new EventTarget();document.querySelector=()=>({disabled:false,click:action});
 new Function('document','location','CustomEvent',source)(document,{pathname},DetailEvent);
 return request=>{let result;const listener=e=>result=JSON.parse(e.detail);document.addEventListener('tmc-calendar-jump-response',listener);try{document.dispatchEvent(new DetailEvent('tmc-calendar-jump-request',{detail:JSON.stringify(request)}));return result}finally{document.removeEventListener('tmc-calendar-jump-response',listener)}};
}
test('page bridge redirects one native week subtraction and restores normal dates',()=>{
 const original=Date.prototype.setDate;
 const unrelated=new Date(2026,8,10),reference=new Date(2026,9,5);
 let requested;
 const send=setup(()=>{unrelated.setDate(3);const next=new Date(reference);next.setDate(next.getDate()-7);requested=next});
 const result=send({id:'one',current:'2026-10-05',target:'2025-09-29'});
 assert.deepEqual(result,{id:'one',clicked:true,hit:true});
 assert.equal(requested.getFullYear(),2025);assert.equal(requested.getMonth(),8);assert.equal(requested.getDate(),29);
 assert.equal(reference.getFullYear(),2026);assert.equal(unrelated.getDate(),3);
 assert.equal(Date.prototype.setDate,original);
 requested.setDate(requested.getDate()+7);assert.equal(requested.getMonth(),9);assert.equal(requested.getDate(),6);
});
test('unsupported native date calculation remains an ordinary navigation action',()=>{
 let clicks=0;const send=setup(()=>clicks++),original=Date.prototype.setDate;
 assert.deepEqual(send({id:'fallback',current:'2026-10-05',target:'2025-09-29'}),{id:'fallback',clicked:true,hit:false});
 assert.equal(clicks,1);assert.equal(Date.prototype.setDate,original);
});
test('native errors restore the prototype and malformed requests do not click',()=>{
 let clicks=0;const original=Date.prototype.setDate,send=setup(()=>{clicks++;throw Error('native error')});
 assert.equal(send({id:'error',current:'2026-10-05',target:'2025-09-29'}).hit,false);
 assert.equal(Date.prototype.setDate,original);
 assert.equal(send({id:'invalid',current:'2026-02-30',target:'2025-09-29'}),undefined);
 assert.equal(send({id:'wrong-start',current:'2026-10-05',target:'2025-09-28'}),undefined);
 assert.equal(clicks,1);
});

test('Releases route uses the same direct week bridge',()=>{
 const current=new Date(2026,9,5);let requested;
 const send=setup(()=>{requested=new Date(current);requested.setDate(requested.getDate()-7)},'/discover/releases');
 assert.equal(send({id:'releases',current:'2026-10-05',target:'2025-09-29'}).hit,true);
 assert.equal(requested.getFullYear(),2025);
});
