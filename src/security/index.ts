import {createHash} from 'node:crypto';
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function redact(text:string,secrets:string[]=[]):string {
 let s=text;for(const key of secrets.filter(Boolean))s=s.split(key).join('[REDACTED]');
 return s.replace(/sk-[A-Za-z0-9_-]{8,}/g,'[API_KEY]').replace(/\b1[3-9]\d{9}\b/g,'[手机号]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[邮箱]').replace(/(Bearer|QQBot)\s+[A-Za-z0-9._-]+/gi,'$1 [TOKEN]');
}
// Deliberately accept fixed operational codes, never provider error strings or message objects.
export function logger(write:(s:string)=>void=console.log) {
 return (code:string,meta:{status?:number;code?:number;count?:number}={})=>write(JSON.stringify({time:new Date().toISOString(),event:/^[a-z_]{1,50}$/.test(code)?code:'internal_error',...meta}));
}
