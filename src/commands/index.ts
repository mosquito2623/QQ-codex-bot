export const help='我是 Codex，AI 群助手。请 @我 后提问。仅处理发给我的消息，近期对话会发送至 OpenAI。\n/help /ping /status /model /summary\n管理员：/reset /admin /enable /disable /code\n默认最近20条，24小时过期；请勿发送敏感信息。';
export const restricted=new Set(['/reset','/admin','/enable','/disable','/code']);
export function command(text:string){const match=/^(\/[a-z]+)(?:\s|$)/i.exec(text);return match?.[1].toLowerCase()??'';}
