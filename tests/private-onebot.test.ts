import {describe,expect,it} from 'vitest';
import {parseOwnerPrivateText,replyToOwner} from '../src/private/onebot.js';
import {PRIVATE_MODEL_ID,XIAOZHIYAO_PERSONA} from '../src/private/persona.js';

const now = 1_800_000_000_000;
const config = {ownerQQ: '123456789',botQQ: '987654321',nowMs: now};
const message = () => ({
  post_type:'message',message_type:'private',sub_type:'friend',
  self_id:987654321,user_id:123456789,sender:{user_id:123456789},
  message_id:42,time:now/1000,message:'你好，小知遥',raw_message:'你好，小知遥',
});

describe('private ordinary QQ inbound boundary',()=>{
  it('only admits a fresh allowlisted friend-text message',()=>expect(parseOwnerPrivateText(message(),config)?.text).toBe('你好，小知遥'));
  it('rejects untrusted sender, wrong receiver and own echoes',()=>{
    expect(parseOwnerPrivateText({...message(),user_id:555551111},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),self_id:555551111},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),user_id:987654321},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),sender:{user_id:555551111}},config)).toBeNull();
  });
  it('ignores groups, temporary sessions, and sent messages',()=>{
    expect(parseOwnerPrivateText({...message(),message_type:'group'},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),sub_type:'group'},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),post_type:'message_sent'},config)).toBeNull();
  });
  it('rejects stale or future events',()=>{
    expect(parseOwnerPrivateText({...message(),time:(now-301_000)/1000},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),time:(now+61_000)/1000},config)).toBeNull();
  });
  it('rejects multimedia, CQ payloads, empty or oversized input',()=>{
    expect(parseOwnerPrivateText({...message(),message:'[CQ:image,file=f.png]'},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),message:[{type:'image',data:{file:'a'}}]},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),message:'  '},config)).toBeNull();
    expect(parseOwnerPrivateText({...message(),message:'x'.repeat(4001)},config)).toBeNull();
  });
  it('accepts text-only OneBot segments',()=>{
    expect(parseOwnerPrivateText({...message(),message:[{type:'text',data:{text:'你好'}},{type:'text',data:{text:'呀'}}]},config)?.text).toBe('你好呀');
  });
  it('builds only a whitelisted recipient private text reply',()=>{
    const parsed=parseOwnerPrivateText(message(),config)!;
    expect(replyToOwner(parsed,'欢迎回来','123456789')).toEqual({action:'send_private_msg',params:{user_id:123456789,message:'欢迎回来',auto_escape:true},echo:'private:42'});
  });
  it('refuses replies addressed to accounts other than the configured owner',()=>{
    const parsed=parseOwnerPrivateText(message(),config)!;
    expect(()=>replyToOwner(parsed,'不该发送','555551111')).toThrow('Not an authorized');
  });
  it('keeps the chosen model and persona separate from old Codex group assistant',()=>{
    expect(PRIVATE_MODEL_ID).toBe('gpt-6-luna');
    expect(XIAOZHIYAO_PERSONA).toContain('小知遥');
  });
});
