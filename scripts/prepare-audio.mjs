import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
await mkdir('public',{recursive:true});await mkdir('../../work/athan-assets',{recursive:true});
for(const recording of [
  {source:'33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg',cache:'athan',file:'athan',short:'athan_short'},
  {source:'Beautiful_adhan.ogg',cache:'beautiful',file:'athan_beautiful',short:'athan_beautiful_short'},
]){
  const cached=`../../work/athan-assets/${recording.cache}.ogg`;
  try{await access(cached)}catch{
    const r=await fetch('https://commons.wikimedia.org/wiki/Special:Redirect/file/'+recording.source,{headers:{'User-Agent':'AthanAppDevelopment/0.1'}});
    if(!r.ok)throw Error(`Audio download failed: ${r.status}`);
    await writeFile(cached,Buffer.from(await r.arrayBuffer()));
  }
  execFileSync(ffmpeg,['-y','-i',cached,'-ac','1','-ar','22050','-b:a','48k',`public/${recording.file}.mp3`],{stdio:'pipe'});
  execFileSync(ffmpeg,['-y','-i',cached,'-t','28','-ac','1','-ar','16000',`public/${recording.short}.wav`],{stdio:'pipe'});
}
const beautiful='Beautiful Adhan: Adam-synagda (2022), CC0 1.0. https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg https://creativecommons.org/publicdomain/zero/1.0/ Converted to mono 22.05 kHz MP3; iOS excerpt trimmed to 28 seconds.\n';
const existing=await readFile('public/ATTRIBUTION.txt','utf8').catch(()=> '');
if(!existing.includes('Beautiful Adhan:'))await writeFile('public/ATTRIBUTION.txt',existing+'\n'+beautiful);
console.log('Prepared both athan recordings and both 28-second iOS excerpts.');
