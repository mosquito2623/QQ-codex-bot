export interface Message {id:string; group:string; user:string; text:string; time:number; role?:string}
export function parseEvent(value:unknown,botId=''):Message|null {
 if(!value||typeof value!=='object')return null;
 const e=value as any,d=e.d,a=d?.author;
 if(e.op!==0||e.t!=='GROUP_AT_MESSAGE_CREATE'||!d||!a||a.bot===true)return null;
 if(typeof a.member_openid!=='string'||a.member_openid===botId||a.id===botId)return null;
 if(![d.id,d.group_openid,a.member_openid].every(x=>typeof x==='string'&&x.length>0&&x.length<=256))return null;
 if(typeof d.content!=='string'||typeof d.timestamp!=='string')return null;
 const time=Date.parse(d.timestamp);if(!Number.isFinite(time)||time>Date.now()+60000||time<Date.now()-270000)return null;
 return {id:d.id,group:d.group_openid,user:a.member_openid,text:d.content.replace(/^\s*<@!?[^>]+>\s*/,'').trim(),time,role:a.member_role};
}
