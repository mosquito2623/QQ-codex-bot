import {createServer,type IncomingMessage} from 'node:http';
import type {Bot} from './bot.js';
import {challenge,verifyRequest} from './qq/signature.js';
async function body(req:IncomingMessage){const parts:Buffer[]=[];let size=0;for await(const b of req){size+=b.length;if(size>65536)throw new Error('Body too large');parts.push(b);}return Buffer.concat(parts);}
export function server(bot:Bot){
 let accepting=true;
 const app=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 if(req.method==='GET'&&req.url==='/healthz'){res.statusCode=accepting?200:503;res.end(JSON.stringify({ok:accepting}));return;}
 if(req.method!=='POST'||req.url!=='/qq/webhook'){res.statusCode=404;res.end('{}');return;}
 if(!accepting){res.statusCode=503;res.end('{}');return;}
 try{
 const raw=await body(req);
 const header=(key:string)=>typeof req.headers[key]==='string'?req.headers[key] as string:'';
 if(header('x-bot-appid')!==bot.cfg.appId||!verifyRequest(bot.cfg.secret,header('x-signature-timestamp'),header('x-signature-ed25519'),raw)){res.statusCode=401;res.end('{}');return;}
 const payload=JSON.parse(raw.toString('utf8'));
 if(payload.op===13){const d=payload.d;if(typeof d?.plain_token!=='string'||typeof d?.event_ts!=='string'||d.plain_token.length>1024){res.statusCode=400;res.end('{}');return;}res.end(JSON.stringify(challenge(bot.cfg.secret,d.event_ts,d.plain_token)));return;}
 const result=bot.accept(payload);
 if(result==='full'){res.statusCode=503;res.end('{}');return;}
 res.end(JSON.stringify({op:12}));void bot.drain();
 }catch{res.statusCode=400;res.end('{}');}
 });
 app.requestTimeout=15000;app.headersTimeout=10000;
 return {app,stopAccepting(){accepting=false;}};
}
