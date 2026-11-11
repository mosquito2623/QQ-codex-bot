/**
 * OneBot v11 private-friend transport boundary for a dedicated ordinary QQ account.
 * This module has no networking, model calls, persistence, or side effects.
 * Only events from the explicitly configured owner's QQ number are admitted.
 */
export type PrivateText = Readonly<{
  selfId: string;
  userId: string;
  messageId: string;
  timeMs: number;
  text: string;
}>;

export type PrivateEventOptions = Readonly<{
  ownerQQ: string;
  botQQ: string;
  nowMs?: number;
  maxAgeMs?: number;
  maxTextChars?: number;
}>;

type UnknownRecord = Record<string, unknown>;
const object = (v: unknown): v is UnknownRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** QQ numbers are numeric identifiers; never coerce arbitrary sender strings. */
function qqId(v: unknown): string | null {
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v) || v <= 0) return null;
    return String(v);
  }
  if (typeof v !== 'string' || !/^[1-9][0-9]{4,15}$/.test(v)) return null;
  return v;
}

function messageId(v: unknown): string | null {
  if (typeof v === 'number') return Number.isSafeInteger(v) && v >= 0 ? String(v) : null;
  if (typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\x00-\x1f]/.test(v)) return v;
  return null;
}

/** Reject multimedia / CQ control segments rather than silently sending hidden content to the AI. */
function textOnly(event: UnknownRecord): string | null {
  const msg = event.message;
  if (typeof msg === 'string') {
    return /\[CQ:[^\]]*\]/i.test(msg) ? null : msg;
  }
  if (!Array.isArray(msg) || msg.length === 0) return null;
  const parts: string[] = [];
  for (const seg of msg) {
    if (!object(seg) || seg.type !== 'text' || !object(seg.data) || typeof seg.data.text !== 'string') return null;
    parts.push(seg.data.text);
  }
  return parts.join('');
}

/** Return null for *anything* that is not a fresh, white-listed private text event. */
export function parseOwnerPrivateText(value: unknown, options: PrivateEventOptions): PrivateText | null {
  if (!object(value) || value.post_type !== 'message' || value.message_type !== 'private') return null;
  // A dedicated bot account should respond only to direct friend chat, not temporary/group-origin chat.
  if (value.sub_type !== undefined && value.sub_type !== 'friend') return null;
  const owner = qqId(options.ownerQQ), bot = qqId(options.botQQ);
  const sender = qqId(value.user_id), self = qqId(value.self_id);
  if (!owner || !bot || owner === bot || sender !== owner || self !== bot) return null;
  if (object(value.sender) && value.sender.user_id !== undefined && qqId(value.sender.user_id) !== sender) return null;
  const mid = messageId(value.message_id);
  if (!mid) return null;
  if (typeof value.time !== 'number' || !Number.isSafeInteger(value.time) || value.time <= 0) return null;
  const timeMs = value.time * 1000;
  if (!Number.isSafeInteger(timeMs)) return null;
  const nowMs = options.nowMs ?? Date.now();
  const ageMs = options.maxAgeMs ?? 300_000;
  if (!Number.isFinite(nowMs) || !Number.isSafeInteger(ageMs) || ageMs < 0 || timeMs < nowMs - ageMs || timeMs > nowMs + 60_000) return null;
  const text = textOnly(value)?.trim();
  const max = options.maxTextChars ?? 4_000;
  if (!Number.isSafeInteger(max) || max <= 0 || !text || text.length > max) return null;
  return {selfId: self, userId: sender, messageId: mid, timeMs, text};
}

export type PrivateSendAction = Readonly<{
  action: 'send_private_msg';
  params: Readonly<{user_id: number; message: string; auto_escape: true}>;
  echo: string;
}>;

/** Safe explicit reply action (not a generic model-executed command). */
export function replyToOwner(message: PrivateText, reply: string, ownerQQ: string, maxChars = 1800): PrivateSendAction {
  if (typeof reply !== 'string' || !reply.trim() || !Number.isSafeInteger(maxChars) || maxChars <= 0) throw new Error('Invalid reply');
  if (!qqId(ownerQQ) || message.userId !== qqId(ownerQQ)) throw new Error('Not an authorized QQ recipient');
  const user_id = Number(message.userId);
  if (!Number.isSafeInteger(user_id) || user_id <= 0) throw new Error('Invalid QQ recipient');
  // Single-purpose outbound action. No public posts or group sends are permitted here.
  return {
    action: 'send_private_msg',
    params: {user_id, message: reply.slice(0, maxChars), auto_escape: true},
    echo: 'private:' + message.messageId,
  };
}
