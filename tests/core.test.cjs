const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../calendar-core.js');
test('parses Trakt unpadded day IDs and rejects invalid dates',()=>{
 assert.equal(C.key(C.parseDay('day-2026-1-3')),'2026-01-03');
 assert.equal(C.parseDay('2026-02-30'),null);
 assert.equal(C.parseDay('not-a-date'),null);
});
test('month cells include every leap day and align to Monday',()=>{
 const cells=C.monthCells(new Date(2028,1,1));
 assert.equal(cells[0].getDay(),1);
 assert(cells.some(d=>C.key(d)==='2028-02-29'));
 assert.equal(cells.length%7,0);
});
test('six-week month remains a full grid',()=>{
 const cells=C.monthCells(new Date(2026,2,1));
 assert.equal(cells.length,42);
 assert.equal(C.key(cells[0]),'2026-02-23');
});
test('month shifts and local date arithmetic cross year and DST correctly',()=>{
 assert.equal(C.key(C.shiftMonth(new Date(2026,11,31),1)),'2027-01-01');
 assert.equal(C.key(C.addDays(new Date(2026,2,28,12),2)),'2026-03-30');
});
test('only same-origin media links are accepted',()=>{
 assert.equal(C.safeLink('/shows/example','https://app.trakt.tv'),'https://app.trakt.tv/shows/example');
 for(const value of ['javascript:alert(1)','https://evil.test/shows/test','/settings','//evil.test/movies/a']) assert.equal(C.safeLink(value,'https://app.trakt.tv'),null);
});
test('media metadata URLs exclude episode paths and drawer parameters',()=>{
 assert.equal(C.mediaHref('/shows/test/seasons/3/episodes/4?view=episode','https://app.trakt.tv'),'https://app.trakt.tv/shows/test');
});
