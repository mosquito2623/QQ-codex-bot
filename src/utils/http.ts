export class RemoteError extends Error {constructor(readonly status:number,readonly code:number=0){super('Remote request failed');}}
export const delay=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export async function jsonRequest(url:string,options:RequestInit,fetcher:typeof fetch=fetch,sleep=delay):Promise<any>{
 for(let attempt=0;attempt<3;attempt++){
 let response:Response;
 try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(10000)});}catch{if(attempt===2)throw new RemoteError(0);await sleep(250*2**attempt);continue;}
 let body:any;try{body=await response.json();}catch{throw new RemoteError(response.status);}
 const code=Number(body?.code??0);
 if(response.status===429||response.status>=500||code===100001||code===40034100||code===50055001){
 if(attempt===2)throw new RemoteError(response.status,code);
 const raw=response.headers.get('retry-after');const seconds=raw?Number(raw):NaN;
 const wait=Number.isFinite(seconds)?seconds*1000:raw?Date.parse(raw)-Date.now():250*2**attempt;
 if(wait>15000)throw new RemoteError(response.status,code);
 await sleep(Math.max(100,wait)+Math.floor(Math.random()*100));continue;
 }
 if(!response.ok||code!==0)throw new RemoteError(response.status,code);return body;
 }throw new RemoteError(0);
}
