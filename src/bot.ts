import type {Config} from './config/index.js';
import type {AI} from './ai/index.js';
import type {Sender} from './qq/client.js';
import {Store,type Job} from './memory/store.js';
import {parseEvent} from './qq/event.js';
import {command,help,restricted} from './commands/index.js';
import {DisabledCodex,type CodingAgent} from './codex/index.js';
import {hash,redact,logger} from './security/index.js';
import {RemoteError} from './utils/http.js';
export class Bot {
 private running=false;private stopping=false;
 private readonly started=Date.now();
 constructor(readonly cfg:Config,readonly store:Store,private ai:AI,private sender:Sender,private log=logger(),private codex:CodingAgent=new DisabledCodex()){}
 accept(payload:unknown){
 const m=parseEvent(payload,this.cfg.botId);
 if(!m||!this.cfg.groups.has(m.group)||!m.text)return 'ignored';
 if(m.text.length>this.cfg.maxInput)m.text='/__too_long';
 m.text=redact(m.text,[this.cfg.apiKey,this.cfg.secret]);
 return this.store.enqueue(m,this.cfg.queueMax);
 }
 async drain(){
 if(this.running)return;this.running=true;
 try{let job:Job|null;while(!this.stopping&&(job=this.store.next()))await this.process(job);}finally{this.running=false;}
 }
 private async process(job:Job){
 const m=job.message;
 if(Date.now()-m.time>240000){this.store.done(job.key,'expired');return;}
 let reply=job.reply;let remember=false;
 try{
 if(reply===null){
 const now=Date.now();
 const u=this.store.consume('user:'+hash(m.group+':'+m.user),this.cfg.userRpm,now+60000);
 const g=this.store.consume('group:'+hash(m.group),this.cfg.groupRpm,now+60000);
 if(!u.allowed||!g.allowed){this.log('local_rate_limited');this.store.done(job.key,'rate_limited');return;}
 const cmd=command(m.text),admin=this.cfg.admins.has(m.user);
 if(restricted.has(cmd)&&!admin)reply='此命令仅限已配置的机器人管理员。';
 else if(cmd==='/enable'||cmd==='/disable'){this.store.enable(m.group,cmd==='/enable');reply=cmd==='/enable'?'机器人已启用。':'机器人已暂停；管理员可用 /enable 恢复。';}
 else if(cmd==='/reset'){this.store.reset(m.group);reply='已清除当前群的近期会话记忆。';}
 else if(cmd==='/ping')reply='pong · 服务在线';
 else if(cmd==='/status')reply=`Codex · AI 助手\n模型：${this.cfg.model}\n当前群：${this.store.enabled(m.group)?'启用':'暂停'}\n运行：${Math.floor((now-this.started)/1000)}秒\n待处理：${this.store.pending()}\nCodex Agent：${this.codex.mode}`;
 else if(cmd==='/model')reply=`当前模型：${this.cfg.model}（Responses API）；Codex Agent：${this.codex.mode}`;
 else if(cmd==='/help')reply=help;
 else if(cmd==='/admin')reply='管理员命令：/reset /enable /disable /status /code。身份以服务器配置的 member_openid 白名单验证。';
 else if(cmd==='/code')reply=await this.codex.run(m.text.slice(5).trim());
 else if(!this.store.enabled(m.group)){this.store.done(job.key,'disabled');return;}
 else if(m.text==='/__too_long')reply=`输入过长，请控制在 ${this.cfg.maxInput} 字以内。`;
 else if(cmd&&cmd!=='/summary')reply='未知命令，请使用 /help。';
 else {
 const day=new Date().toISOString().slice(0,10);
 const usage=this.store.consume('daily:'+day,this.cfg.daily,Date.parse(day+'T00:00:00Z')+86400000);
 // Conservative local reservation includes two potential SDK attempts and UTF-8 byte bound.
 const reserve=Math.ceil(2*((4*this.cfg.contextChars+2048)*this.cfg.inputPrice+this.cfg.maxTokens*this.cfg.outputPrice));
 const budget=this.store.consume('usd:'+day,Math.floor(this.cfg.dailyUsd*1e6),Date.parse(day+'T00:00:00Z')+86400000,reserve);
 if(budget.n>=this.cfg.dailyUsd*1e6*this.cfg.warn/100)this.log('cost_budget_warning',{count:budget.n});
 if(!budget.allowed)reply='今日预估费用预算不足，已暂停 AI 调用。';
 else if(!usage.allowed)reply='今日 AI 调用额度已用完，请明天再试。';
 else{
 if(usage.n>=Math.ceil(this.cfg.daily*this.cfg.warn/100))this.log('daily_budget_warning',{count:usage.n});
 const history=this.store.history(m.group);
 if(cmd==='/summary'&&history.length===0)reply='当前没有可总结的机器人对话。';
 else{try{reply=await this.ai.answer(history,cmd==='/summary'?'请总结以上机器人有权访问的近期对话；不要猜测未提供的群消息。':m.text);remember=cmd!=='/summary';}catch{this.log('ai_request_failed');reply='AI 服务暂时无法回答，请稍后重新 @我。';}}
 }
 }
 reply=redact(reply??'暂时无法回答。',[this.cfg.apiKey,this.cfg.secret]).slice(0,this.cfg.maxOutput).replace(/https?:\/\/\S+/g,'[链接已省略]');
 // Persist turns and reply atomically before delivery. Crash recovery reuses cached reply.
 this.store.db.exec('BEGIN');try{this.store.saveReply(job.key,reply);if(remember){this.store.append(m.group,'user',m.text);this.store.append(m.group,'assistant',reply);}this.store.db.exec('COMMIT');}catch(e){this.store.db.exec('ROLLBACK');throw e;}
 }
 await this.sender.send(m,reply);this.store.done(job.key);this.log('reply_sent');
 }catch(e){this.log('job_failed',e instanceof RemoteError?{status:e.status,code:e.code}:{});this.store.done(job.key,'failed');}
 }
 async stop(){this.stopping=true;while(this.running)await new Promise(r=>setTimeout(r,25));}
}
