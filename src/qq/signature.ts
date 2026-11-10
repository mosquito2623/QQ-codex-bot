import {createPrivateKey,createPublicKey,sign,verify} from 'node:crypto';
export function keys(secret:string){
 if(!secret)throw new Error('Empty signing secret');
 let seed=Buffer.from(secret);while(seed.length<32)seed=Buffer.concat([seed,seed]);
 const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed.subarray(0,32)]),format:'der',type:'pkcs8'});
 return {privateKey,publicKey:createPublicKey(privateKey)};
}
export function challenge(secret:string,ts:string,plain:string){return {plain_token:plain,signature:sign(null,Buffer.from(ts+plain),keys(secret).privateKey).toString('hex')};}
export function verifyRequest(secret:string,ts:string,sig:string,body:Buffer,now=Date.now()):boolean {
 if(!/^\d{10}$/.test(ts)||Math.abs(now-Number(ts)*1000)>300000||! /^[a-f0-9]{128}$/i.test(sig))return false;
 try{return verify(null,Buffer.concat([Buffer.from(ts),body]),keys(secret).publicKey,Buffer.from(sig,'hex'));}catch{return false;}
}
