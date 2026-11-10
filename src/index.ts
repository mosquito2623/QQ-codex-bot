import {config} from './config/index.js';
import {Store} from './memory/store.js';
import {ResponsesAI} from './ai/index.js';
import {QQClient} from './qq/client.js';
import {Bot} from './bot.js';
import {server} from './server.js';
import {logger} from './security/index.js';
const log=logger();
try{
 const cfg=config();const store=new Store(cfg.db,cfg.history,cfg.ttl);
 const bot=new Bot(cfg,store,new ResponsesAI(cfg),new QQClient(cfg),log);
 const http=server(bot);
 const clean=setInterval(()=>store.cleanup(),60000);clean.unref();
 http.app.listen(cfg.port,'0.0.0.0',()=>{log('service_started');void bot.drain();});
 http.app.on('error',()=>{log('server_error');process.exitCode=1;});
 let closing=false;
 const shutdown=async()=>{if(closing)return;closing=true;log('service_stopping');http.stopAccepting();clearInterval(clean);
 const force=setTimeout(()=>process.exit(1),75000);force.unref();
 await new Promise<void>(r=>http.app.close(()=>r()));await bot.stop();store.close();clearTimeout(force);};
 process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
}catch(e){console.error(e instanceof Error&&/^(Missing required|Invalid configuration|Wildcard)/.test(e.message)?e.message:'Startup failed; check configuration and database permissions');process.exitCode=1;}
