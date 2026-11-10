import {readFileSync,readdirSync} from 'node:fs';
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const files=walk('src');
for(const f of files){const text=readFileSync(f,'utf8');if(/from ['"]node:child_process|eval\(|execSync\(/.test(text))throw Error('Unexpected execution capability: '+f);if(/sk-proj-[a-zA-Z0-9_-]{20,}/.test(text))throw Error('Potential credential: '+f);}
console.log('Static execution/credential checks passed; not a penetration test.');
