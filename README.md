# Codex · QQ 官方群聊 AI 机器人

状态：代码实现和本机 Mock 验证；尚未部署，尚未完成真实 QQ / OpenAI 收发验收。

Node.js 24 LTS + TypeScript + OpenAI 官方 SDK Responses API + Node 内置 SQLite + 官方 QQ HTTPS Webhook。没有模拟 QQ 登录、非官方协议、永久轮询或 Shell 执行能力。

## 快速开始

1. 安装 Node 24，运行 `npm ci --ignore-scripts`。
2. 在部署平台 Secrets/Variables 配置 `.env.example` 的必填值；本地可使用不受版本控制的 `.env` 并通过 `node --env-file=.env dist/index.js` 启动。`npm start` 本身不会读取 `.env`。
3. `npm run typecheck && npm test && npm run build && npm run security`。
4. 云部署参考 [DEPLOYMENT.md](DEPLOYMENT.md)，验收参考 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 实现行为

- POST `/qq/webhook`：原始请求体 Ed25519 验签、AppID 校验、5分钟签名时间窗口、官方 op13 验证与 op12 ACK。
- 只接受 `GROUP_AT_MESSAGE_CREATE`；忽略全量群消息、单聊、机器人发送者、自身 OpenID。没有附件下载或不可信 URL 抓取。
- SQLite 先落盘再 ACK，按群+消息ID去重，缓存回复。重启恢复已接收任务，同一回复始终使用 `msg_seq=1`，网络重试不会提高序号形成重复刷屏。
- 调用当前官方 `https://api.bot.qq.com/app/getAppAccessToken`，缓存令牌并提前60秒刷新；鉴权 `QQBot ACCESS_TOKEN`。回复 `/v2/groups/{group_openid}/messages`，纯文本 msg_type=0，携带原始 msg_id。
- 只发送一条有长度上限的被动回复。4分钟以上的任务不再处理，发送前再次检查接近5分钟窗口。超期不会改为主动推送。
- 每群最近20条用户/助手消息（共20条，不是20轮），默认24小时过期；可配置。群标识在记忆表中散列，原始群/成员ID仅为未完成回复短暂保留。已完成任务立即删除 payload 与 reply；去重哈希保留24小时。
- `/help /ping /status /model /summary`；`/reset /admin /enable /disable /code` 仅机器人管理员白名单可用。机器人管理员不是自动等同于所有 QQ 群管理员。
- `/summary` 只使用该群当前机器人对话；不读取其他群或未触发消息。`/reset` 只清除此群上下文。
- 每用户和每群固定窗口限流；日调用次数按 UTC 日计数。单实例串行处理（有效并发=1），避免同群上下文和 reset 竞争。配置 `AI_CONCURRENCY` 只允许1；不支持多副本。
- 预估美元预算：必须填写所选模型当前的输入/输出单价及 DAILY_BUDGET_USD；按 UTF-8 最坏输入量、输出上限和两次潜在 SDK 尝试预留费用。达到阈值输出 `cost_budget_warning`，超额拒绝模型调用。失败不返还预留，偏保守。它不是供应商账单或结算保证；特殊模型的额外计费和单价变更需重新审查，并同时设置平台预算告警。
- 官方 OpenAI SDK，模型由环境变量提供；无模型默认值、无工具、`store:false`，45秒总超时，一次 SDK 重试。程序只传递预算内的该群历史，日志不记录消息、响应体和异常字符串。
- 正则脱敏手机号、邮箱和常见密钥；有限模式不能识别所有个人信息。不要输入身份证、密码或私密资料。
- 临时发现身份模式 `node dist/setup.js`，需 `SETUP_MODE=true`，只输出签名验证通过且带群主/管理员角色的事件中的群/成员OpenID，不输出正文。仅配置阶段使用，记录ID后关闭并清理发现日志。

## 真正的 Codex 能力

`src/codex/index.ts` 定义独立 CodingAgent 接口，当前只有 DisabledCodex。`/code` 不运行 SDK，不运行命令，不把普通 Responses API 标成 Codex Agent。普通聊天可以分析和生成代码。

官方提供 `@openai/codex-sdk` 控制本地 Codex 线程，App Server 用于认证、审批、历史与流式客户端集成。未来执行服务需要独立容器/VM、无宿主挂载和Docker socket、受限网络、独立短期授权、任务时间/CPU/内存/输出限制和逐项审批；只设置一个工作目录不构成可靠隔离。当前没有启用这些条件，不提供启用执行的环境变量开关。

## 隐私和上线边界

向群成员清楚告知：仅 @机器人 的正文和该群近期机器人会话会发送给 OpenAI；保存期限和清除方式见 /help。上线前由运营者完成 QQ 平台要求的隐私声明、群主授权、数据处理和跨境传输条件核实，不能以正则脱敏代替这些要求。`store:false` 不等于供应商绝对零留存。

SQLite 文件权限0600；数据库卷、备份与日志应设置云平台访问控制/加密。TTL逻辑删除与 WAL checkpoint 不等于云备份立即销毁；备份过期策略由运营者配置。不要将数据库、真实 .env 或日志上传到公开仓库。

## 故障诊断

日志只有固定事件码、数值状态/业务错误码和计数：`service_started`、`ai_request_failed`、`job_failed`、`reply_sent`、`daily_budget_warning`、`cost_budget_warning`。`job_failed` 中 code=40054010 表示URL不允许，304103/40034005表示回复过期；401通常需检查凭证。`/healthz` 仅检查服务存活，不证明外部凭证/QQ入群成功。

API 网络错误/429/5xx 使用有界重试与退避，最长 Retry-After 超过15秒则失败；HTTP 200 的业务错误同样处理。不记录提供商错误正文。持续故障任务终止并记录错误，用户可再次 @ 提问；进程中断任务会从数据库恢复。

## 验证

`npm run typecheck`、`npm test`、`npm run build`、`npm run security`。测试都是本机 Mock 或本机HTTP集成，签名公钥对照官方向量；真实请求尚未运行。由于采用Webhook，WebSocket心跳/断线重连测试不适用，替代覆盖回调重投去重和服务重启恢复。详见 [VALIDATION.md](VALIDATION.md)。
