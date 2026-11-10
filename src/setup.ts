// Temporary identity discovery: enable explicitly, remove after owner records IDs.
import {createServer} from 'node:http';
import {challenge,verifyRequest} from './qq/signature.js';
import {parseEvent} from './qq/event.js';
const appId=process.env.QQ_APP_ID,secret=process.env.QQ_APP_SECRET;
if(process.env.SETUP_MODE!=='true'||!appId||!secret)throw new Error('Identity discovery requires SETUP_MODE=true and QQ credentials');
const app=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 if(req.method==='GET'&&req.url==='/healthz'){res.end('{"setup":true}');return;}
 if(req.method!=='POST'||req.url!=='/qq/webhook'){res.statusCode=404;res.end('{}');return;}
 try{const parts:Buffer[]=[];let size=0;for await(const b of req){size+=b.length;if(size>65536)throw Error();parts.push(b);}const raw=Buffer.concat(parts);
 const ts=req.headers['x-signature-timestamp'],sig=req.headers['x-signature-ed25519'];
 if(req.headers['x-bot-appid']!==appId||typeof ts!=='string'||typeof sig!=='string'||!verifyRequest(secret,ts,sig,raw)){res.statusCode=401;res.end('{}');return;}
 const p=JSON.parse(raw.toString());if(p.op===13&&typeof p.d?.event_ts==='string'&&typeof p.d?.plain_token==='string'){res.end(JSON.stringify(challenge(secret,p.d.event_ts,p.d.plain_token)));return;}
 const m=parseEvent(p);if(m&&['owner','admin'].includes(m.role??''))console.log(JSON.stringify({event:'setup_identity',group_openid:m.group,member_openid:m.user}));
 res.end('{"op":12}');
 }catch{res.statusCode=400;res.end('{}');}
});
app.requestTimeout=15000;app.headersTimeout=10000;
app.listen(Number(process.env.PORT??8080),'0.0.0.0');
process.on('SIGTERM',()=>app.close());
