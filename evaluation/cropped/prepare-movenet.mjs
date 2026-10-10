/** Pinned official MoveNet assets; never reads videos or private diagnostics. */
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT} from '../lib.mjs';
const directory=resolve(ROOT,'frontend/artifacts/recovery-models/movenet-thunder');
const origin='https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4/';
const assets=[
 {name:'model.json',bytes:168153,sha256:'0e3acd45088054f5ae64bede16f1bd48f083cdf0a93a8af5102cc8a6e14b48de'},
 {name:'group1-shard1of3.bin',bytes:4194304,sha256:'58dd47fd600a4849c342ce14e2ec32102744ca3d5f7fd9e6888d284f7f922cba'},
 {name:'group1-shard2of3.bin',bytes:4194304,sha256:'08da980bc00886854f29b49b9c14528cd41626c0498c67b450de394713f1d0bc'},
 {name:'group1-shard3of3.bin',bytes:4088504,sha256:'c1c6b712e33456aa95aa556b6425528d04fe8730ce9b92de38ec58e947fede34'},
];
const verifyOnly=process.argv.includes('--verify-only');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function verify(asset,bytes){
 if(bytes.length!==asset.bytes||sha(bytes)!==asset.sha256)throw Error(`Pinned size/hash mismatch: ${asset.name}. Refusing changed model contents.`);
 if(asset.name==='model.json'){
  const names=JSON.parse(bytes.toString('utf8')).weightsManifest.flatMap(group=>group.paths);
  if(JSON.stringify(names)!==JSON.stringify(assets.slice(1).map(item=>item.name)))throw Error('Unexpected model shard list.');
 }
}
mkdirSync(directory,{recursive:true});
for(const asset of assets){
 const path=resolve(directory,asset.name);
 if(existsSync(path)){verify(asset,readFileSync(path));console.log(`Verified cached ${asset.name}`);continue;}
 if(verifyOnly)throw Error(`Missing ${asset.name}; verify-only does not download.`);
 const response=await fetch(origin+asset.name+'?tfjs-format=file',{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error(`Official asset request failed (${response.status}): ${asset.name}`);
 let bytes=Buffer.from(await response.arrayBuffer());
 // Match the inspected artifact's trailing CRLF across operating systems. The
 // JSON interior is untouched and the complete normalized file is hash-pinned.
 if(asset.name==='model.json')bytes=Buffer.from(bytes.toString('utf8').trimEnd()+'\r\n','utf8');
 verify(asset,bytes);const temporary=path+'.download';writeFileSync(temporary,bytes);renameSync(temporary,path);
 console.log(`Downloaded and verified ${asset.name}`);
}
