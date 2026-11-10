export interface Config {
 appId:string; secret:string; apiKey:string; model:string; botId:string;
 groups:Set<string>; admins:Set<string>; db:string; port:number; history:number; ttl:number;
 maxInput:number; maxOutput:number; maxTokens:number; contextChars:number; concurrency:number;
 userRpm:number; groupRpm:number; daily:number; warn:number; timeout:number; queueMax:number; dailyUsd:number; inputPrice:number; outputPrice:number;
}
export function config(env:NodeJS.ProcessEnv=process.env):Config {
 const required=(k:string)=>{const v=env[k]?.trim();if(!v)throw new Error(`Missing required configuration: ${k}`);return v;};
 const number=(k:string,d:number,min=1,max=1e8)=>{const v=Number(env[k]??d);if(!Number.isInteger(v)||v<min||v>max)throw new Error(`Invalid configuration: ${k}`);return v;};
 const price=(k:string)=>{const v=Number(required(k));if(!Number.isFinite(v)||v<=0||v>10000)throw new Error(`Invalid configuration: ${k}`);return v;};
 const set=(k:string)=>new Set(required(k).split(',').map(s=>s.trim()).filter(Boolean));
 const groups=set('QQ_GROUP_ALLOWLIST'),admins=set('QQ_ADMIN_OPENIDS');
 if(groups.has('*')||admins.has('*'))throw new Error('Wildcard permissions forbidden');
 return {appId:required('QQ_APP_ID'),secret:required('QQ_APP_SECRET'),apiKey:required('OPENAI_API_KEY'),model:required('OPENAI_MODEL'),botId:env.QQ_BOT_OPENID??'',groups,admins,
 db:env.DB_PATH??'data/bot.sqlite',port:number('PORT',8080,1,65535),history:number('HISTORY_LIMIT',20,2,100),ttl:number('HISTORY_TTL_HOURS',24,1,720)*3600000,
 maxInput:number('MAX_INPUT_CHARS',4000,1,16000),maxOutput:number('MAX_OUTPUT_CHARS',1800,100,2000),maxTokens:number('MAX_OUTPUT_TOKENS',900,32,4096),contextChars:number('CONTEXT_MAX_CHARS',12000,100,64000),concurrency:number('AI_CONCURRENCY',1,1,1),
 userRpm:number('USER_RPM',5,1,60),groupRpm:number('GROUP_RPM',15,1,20),daily:number('DAILY_CALL_LIMIT',200,1,100000),warn:number('DAILY_WARNING_PERCENT',80,1,100),timeout:number('AI_TIMEOUT_MS',45000,1000,60000),queueMax:number('QUEUE_MAX',100,1,1000),dailyUsd:price('DAILY_BUDGET_USD'),inputPrice:price('INPUT_USD_PER_MILLION'),outputPrice:price('OUTPUT_USD_PER_MILLION')};
}
