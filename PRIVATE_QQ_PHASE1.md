# 小知遥 V3：普通 QQ 私聊方案（第一阶段）
日期：2026-11-11。开发分支：`feature/snowluma-qq-private`。

## 用户固定需求
1. 单独注册、由用户持有的普通 QQ 账号；和用户自己的主 QQ 号私聊。**不使用 QQ 开放平台机器人身份**。
2. 大模型固定 `gpt-6-luna`，暂不替换为国产模型。
3. 仅靠 iPhone 管理；不依赖 Railway；理想状态是一台能常驻运行的 Linux VPS。
4. 以后逐步加入长期记忆、私人日记、定时问候、仅指定 QQ 好友可见的空间动态。
5. API 账户当前无余额，先使用 Mock 测试，不擅自充值、购买服务器、部署或触发真实调用。

## 2026-11-11 已完成
- 新增 `src/private/onebot.ts`，独立于原 QQ 官方群机器人。
- 解析 OneBot v11 普通账号的 `post_type=message`、`message_type=private` 文本消息。
- 只允许来自指定主 QQ 号、发往指定小知遥 QQ 号、5 分钟内的新好友私聊；拒绝自身消息、临时会话、群聊、过期消息、CQ 多媒体消息、伪造 sender、不合法/过长输入。
- 提供只允许向指定用户发送私聊文本的 `send_private_msg` 动作构造器。
- 新增单独的 `src/private/persona.ts`，把模型常量固定为 `gpt-6-luna`；不修改原 Codex 群机器人提示词。
- 新增 `tests/private-onebot.test.ts`，包含 9 个 Vitest 测试用例。
- 已在隔离的本地环境通过两个新 TS 模块的严格 TypeScript 编译和 7 个 Node Mock 断言；**尚未运行仓库整体 typecheck、Vitest 与 Docker 构建，也没有实机测试**。

## 技术路线更新
原 `SNOWLUMA_MIGRATION.md` 是历史规划，SnowLuma 转私有后不再作为实施依据。改以 NapCat 官方 Docker 版本作候选接入层，但它属于非官方 QQ 自动化方式，必须使用独立测试 QQ，并承认风控、封号或项目下线的风险。

参考：
- https://github.com/NapNeko/NapCat-Docker
- https://napneko.github.io/use/integration
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/supported-countries

## 未完成且不能称作“已上线”
- 私聊 OneBot 反向 WebSocket 接入与发送的实际网络适配器。
- 私人 SQLite 聊天存储、去重、重启恢复、API 调用费用熔断。
- 日记生成与稳定的定时调度；QQ 空间接口必须默认关闭发布，并验证真正的指定好友可见。
- Docker Compose、一键部署、安全远程管理、备份恢复、CI 完整测试。
- 安全的服务器购买、实机 QQ 登录、官方 API 地区合规和真实 Luna 调用验证。

## 后续开发顺序
1. 完成反向 OneBot WebSocket 适配器，使用 Fake WebSocket / Fake AI 端到端测试。
2. 独立 SQLite 私聊记忆和日记草稿。
3. 独立 Docker Compose，可在 iPhone 的远程 SSH 控制台部署；管理端口不得直接公网暴露。
4. 完成测试并核查云服务器、模型访问资格；再由用户决定付费。
5. 真正的 QQ 私聊与模型接口验收，最后才试验私人 Qzone 动态。

安全边界：不把聊天、QQ 号、API 密钥和网页登录凭据提交到公共 GitHub 仓库；不要试图绕过 OpenAI 地区政策。技术上能访问 API 不等于账户和实际使用地受支持。
