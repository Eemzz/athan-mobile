import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schedule,nextPrayer,normalize,defaults,notificationRows,validLocation,type Settings} from './prayers';
const sf:Settings={...defaults,location:{label:'SF',latitude:37.7749,longitude:-122.4194,timezone:'America/Los_Angeles'}};
test('five ordered prayers per day, including midnight rollover',()=>{
 const now=new Date('2026-10-30T18:00:00Z');const rows=schedule(sf,now,2);
 assert.equal(rows.length,10);assert.deepEqual(rows.slice(0,5).map(p=>p.name),['Fajr','Dhuhr','Asr','Maghrib','Isha']);
 rows.forEach((p,i)=>{if(i)assert(p.at>rows[i-1].at)});
 assert.equal(nextPrayer(rows,new Date(rows[4].at.getTime()+1))?.name,'Fajr');
 assert.equal(nextPrayer(rows,rows[0].at)?.name,'Dhuhr');
});
test('chosen location time zone determines the calendar day',()=>{
 const tokyo:Settings={...sf,location:{label:'Tokyo',latitude:35.6762,longitude:139.6503,timezone:'Asia/Tokyo'}};
 const rows=schedule(tokyo,new Date('2026-10-30T23:30:00Z'),1);
 assert.equal(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(rows[0].at),'2026-10-31');
});
test('Hanafi changes Asr without changing Dhuhr',()=>{
 const day=new Date('2026-10-30T18:00:00Z');const a=schedule(sf,day,1),b=schedule({...sf,hanafi:true},day,1);
 assert(b[2].at>a[2].at);assert.equal(a[1].at.getTime(),b[1].at.getTime());
});
test('notification window respects future times, per-prayer muting, and iOS limit',()=>{
 const now=new Date('2026-10-30T18:00:00Z');const s:Settings={...sf,alerts:true,muted:['Fajr']};const chosen=notificationRows(schedule(s,now,30),s,now);
 assert.equal(chosen.length,60);assert(chosen.every(p=>p.at>now&&p.name!=='Fajr'));assert.equal(notificationRows(chosen,{...s,alerts:false},now).length,0);
});
test('Arabic diacritics and Latin transliteration punctuation do not prevent search',()=>{
 assert.equal(normalize('ٱلْحَمْدُ'),'الحمد');assert.equal(normalize('Al-Fātiḥah'),normalize('Alfatihah'));
});
test('location validation rejects invalid coordinates and time zones',()=>{
 assert(validLocation(sf.location!));assert(!validLocation({...sf.location!,latitude:91}));assert(!validLocation({...sf.location!,timezone:'Wrong/Zone'}));assert(!validLocation({...sf.location!,longitude:NaN}));
});
