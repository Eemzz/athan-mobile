import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recordingFor } from './recordings';
import { defaults } from './prayers';
test('Beautiful Adhan is the default and the fallback for older saved settings',()=>{
  assert.equal(defaults.recording,'beautiful');
  assert.equal(recordingFor(undefined).label,'Beautiful Adhan');
  assert.equal(recordingFor('prophets-mosque').file,'athan_beautiful.mp3');
  assert.equal(recordingFor('invalid').file,'athan_beautiful.mp3');
});
test('retained recording has full audio and an iOS-compatible excerpt',()=>{
  const recording=recordingFor('beautiful');
    assert(readFileSync('public/'+recording.file).length>100000);
    const wav=readFileSync('public/'+recording.iosSound);
    assert.equal(wav.toString('ascii',0,4),'RIFF');
    let offset=12,byteRate=0,duration=0;
    while(offset+8<=wav.length){const tag=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(tag==='fmt ')byteRate=wav.readUInt32LE(offset+16);if(tag==='data')duration=size/byteRate;offset+=8+size+(size%2);}
    assert(duration>27&&duration<30,`${recording.label} notification excerpt must fit iOS's limit`);
});
