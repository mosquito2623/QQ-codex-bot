import type {Config} from '../config/index.js';
import type {Message} from './event.js';
import {jsonRequest,RemoteError,delay} from '../utils/http.js';
export interface Sender {send(message:Message,text:string):Promise<void>}
export class QQClient implements Sender {
 private token='';private expires=0;private pending?:Promise<string>;
 constructor(private cfg:Config,private fetcher:typeof fetch=fetch,private sleep=delay){}
 invalidate(){this.expires=0;}
 async accessToken():Promise<string>{
 if(this.token&&Date.now()<this.expires)return this.token;
 if(this.pending)return this.pending;
 this.pending=(async()=>{const b=await jsonRequest('https://api.bot.qq.com/app/getAppAccessToken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appId:this.cfg.appId,clientSecret:this.cfg.secret})},this.fetcher,this.sleep);
 if(typeof b.access_token!=='string'||!(Number(b.expires_in)>60))throw new RemoteError(200);
 this.token=b.access_token;this.expires=Date.now()+(Number(b.expires_in)-60)*1000;return this.token;})();
 try{return await this.pending;}finally{this.pending=undefined;}
 }
 async send(m:Message,text:string){
 if(Date.now()-m.time>290000)throw new RemoteError(400,304103);
 const body=JSON.stringify({msg_type:0,content:text,msg_id:m.id,msg_seq:1});
 for(let i=0;i<2;i++)try{
 await jsonRequest(`https://api.bot.qq.com/v2/groups/${encodeURIComponent(m.group)}/messages`,{method:'POST',headers:{Authorization:`QQBot ${await this.accessToken()}`,'Content-Type':'application/json'},body},this.fetcher,this.sleep);return;
 }catch(e){if(e instanceof RemoteError&&e.code===40054005)return; // same msg_id + seq already delivered
 if(i===0&&e instanceof RemoteError&&e.status===401){this.invalidate();continue;}throw e;}
 }
}
