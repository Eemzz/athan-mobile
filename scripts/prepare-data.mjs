import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
await mkdir('public',{recursive:true});
const base='https://quran-json.risanb.com';
const get=async path=>{const r=await fetch(base+path);if(!r.ok)throw Error(`Dataset request failed: ${path} (${r.status})`);return r.json()};
const [chapters,arabic,english,sources]=await Promise.all([get('/chapters.json'),get('/text/uthmani/quran.json'),get('/translations/en-pickthall/quran.json'),get('/meta/sources.json')]);
const data=chapters.map(s=>({...s,notice:arabic.find(a=>a.id===s.id).notice,verses:arabic.find(a=>a.id===s.id).verses.map(v=>({...v,translation:english.find(e=>e.id===s.id).verses.find(e=>e.id===v.id).translation}))}));
if(data.length!==114||data.reduce((n,s)=>n+s.verses.length,0)!==6236)throw Error('Incomplete Quran dataset');
await writeFile('public/quran.json',JSON.stringify(data));
await writeFile('public/QURAN-LICENSE.txt',data[0].notice+'\n\nEnglish: Marmaduke Pickthall (1930), public domain.\nSource and licensing: https://quran-json.risanb.com/meta/sources.json\n');
await writeFile('public/quran-sources.json',JSON.stringify(sources,null,2));
console.log('Bundled 114 surahs and 6,236 verses with English translation.');
// Original recording from Wikimedia Commons, ejaz215, CC BY 3.0.
const source='https://commons.wikimedia.org/wiki/Special:Redirect/file/33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg';
const response=await fetch(source,{headers:{'User-Agent':'AthanAppDevelopment/0.1 (offline app audio attribution)'}});
if(!response.ok)throw Error(`Audio download failed: ${response.status}`);
await mkdir('../../work/athan-assets',{recursive:true});
await writeFile('../../work/athan-assets/athan.ogg',Buffer.from(await response.arrayBuffer()));
execFileSync(ffmpeg,['-y','-i','../../work/athan-assets/athan.ogg','-ac','1','-ar','22050','-b:a','48k','public/athan.mp3'],{stdio:'pipe'});
execFileSync(ffmpeg,['-y','-i','../../work/athan-assets/athan.ogg','-t','28','-ac','1','-ar','16000','public/athan_short.wav'],{stdio:'pipe'});
await writeFile('public/ATTRIBUTION.txt',`Quran: Quran JSON dataset https://quran-json.risanb.com/ Arabic text from Tanzil (CC BY 3.0; verbatim copying only); English: Marmaduke Pickthall, 1930, public domain. Arabic text preserved verbatim, including its copyright notice per surah. https://tanzil.net/docs/text_license\n\nAthan: ejaz215, Call to prayer from the Prophet mosque, CC BY 3.0. https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg https://creativecommons.org/licenses/by/3.0/ Converted to mono 22.05 kHz MP3; iOS notification excerpt trimmed to 28 seconds.\n\nPrayer calculations: Adhan by Batoul Apps, MIT. https://github.com/batoulapps/adhan-js\nIcons: Lucide, ISC. https://lucide.dev/license\n`);
await writeFile('public/ATTRIBUTION.txt',(await readFile('public/ATTRIBUTION.txt','utf8'))+'\nQuran JSON packaging/metadata: Risan Bagja Pradana, CC BY-SA 4.0. https://github.com/risan/quran-json https://creativecommons.org/licenses/by-sa/4.0/\n');
console.log('Bundled full athan and a 28-second iOS notification excerpt.');

