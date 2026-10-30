import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recordingFor } from './recordings';
import { defaults } from './prayers';
test('Beautiful Adhan is the default and the fallback for older saved settings',()=>{
  assert.equal(defaults.recording,'beautiful');
  assert.equal(recordingFor(undefined).label,'Beautiful Adhan');
  assert.equal(recordingFor('invalid').file,'athan_beautiful.mp3');
});
test('each recording has its own Android channel and iOS sound',()=>{
  const beautiful=recordingFor('beautiful'),prophets=recordingFor('prophets-mosque');
  assert.notEqual(beautiful.channel,prophets.channel);
  assert.equal(prophets.file,'athan.mp3');assert.equal(prophets.iosSound,'athan_short.wav');
  for(const recording of [beautiful,prophets]){
    assert(readFileSync('public/'+recording.file).length>100000);
    const wav=readFileSync('public/'+recording.iosSound);
    assert.equal(wav.toString('ascii',0,4),'RIFF');
    let offset=12,byteRate=0,duration=0;
    while(offset+8<=wav.length){const tag=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(tag==='fmt ')byteRate=wav.readUInt32LE(offset+16);if(tag==='data')duration=size/byteRate;offset+=8+size+(size%2);}
    assert(duration>27&&duration<30,`${recording.label} notification excerpt must fit iOS's limit`);
  }
});
