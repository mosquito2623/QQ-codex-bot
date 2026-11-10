# SnowLuma 私人 QQ 知遥迁移计划（仅 iPhone 管理）
日期：2026-11-10。状态：规划与迁移准备中，尚未购买服务器，也没有验证真实 QQ 登录或 API 连接。本分支不得直接替换生产部署。

## 已核对的现状
- 当前代码：Node.js 24 / TypeScript / OpenAI Responses SDK / SQLite。
- 目前只接受 QQ 开放平台 `GROUP_AT_MESSAGE_CREATE`（群 @）；使用 `/qq/webhook`、Ed25519 验签、官方发送接口；**不支持个人 QQ 的 OneBot 私聊**。
- 现有 `src/ai/index.ts` 人物设定是 Codex 学习和代码助手，不是知遥；现有记忆按群存储且默认 24 小时到期。
- 必须保留旧代码和测试，将新适配器放在独立模块，绝不直接在主分支替换现有生产行为。

## 目标
iPhone → 加密私网管理一台 Linux VPS → Docker SnowLuma（自带 Linux QQ / noVNC / OneBot） + 本机 AI 服务（OpenAI API 或当前地区合法可用的其他供应商）+ SQLite 私聊记忆和日记。不要 Railway。
SnowLuma 官方文档：https://snowluma.github.io/zh/docs/guide/deploy/docker
- 要求 Docker 能使用 SYS_PTRACE、seccomp=unconfined、/dev/shm ≥ 1GB。
- 宿主机 **不要** 将 6081、5099、3000、3001 直接暴露公网；只允许私有网络访问。
- QQ 登录需实际验证远程登录步骤；同一 iPhone 扫自己屏幕上的二维码能否完成授权仍待测试。
- 非官方客户端注入可能导致 QQ 风控或封禁；仅使用独立测试 QQ 账号。

## 地区与价格提醒
- 腾讯云 109 元/年的 4C4G 中国内地机型，仅是特定优惠，不能默认当作 GPT-6 Luna 全套可用方案。
- OpenAI API 地区支持列表：https://developers.openai.com/api/docs/supported-countries ，**中国内地不在支持范围**，选海外服务器并不能自动保证用户/组织符合访问资格。部署前核对使用条件。
- 腾讯云海外 Linux 入门型参考：2C4G 约人民币 42 元/月（实际区域库存、套餐和结算价以官方为准）；来源：https://cloud.tencent.com/document/product/1207/73452
- GPT-6 Luna 官方参考输入 $0.10 / 100万 token，输出 $0.50 / 100万 token；模型和账号可用性要由用户自己的 API 项目核验。
- 在条件未明确之前不要购买长期服务器，不要充值或输入 API key 至聊天/公开仓库。

## 开发阶段（独立分支）
1. 将官方 QQ 协议与新 OneBot v11 私聊入口拆成 adapters，保持现有功能可回滚。
2. 只接受用户明确指定的 QQ 号白名单，忽略自身消息/群消息；防刷屏、幂等去重。
3. SnowLuma 和 AI 服务优先 Docker 内部网络通信（不必公网端口），OneBot HTTP/WS 的方向以双方实现测试决定。
4. 独立的知遥 system prompt 与可配置模型（默认 gpt-6-luna，如可用）；与原 Codex persona 不混用。
5. SQLite 添加个人聊天记录、事实记忆、每日摘要/日记草稿，有限期备份与恢复；不将密钥或个人聊天写入日志。
6. 每日任务用持久计划调度，重启后不重复运行；默认只能创建草稿。
7. QQ 空间发布 `send_qzone_msg` 只在完成白名单可见性实验后启用。参数 `ugc_right=16`、`target_uins=[目标QQ号]`，从不回退至公共权限 `1`；应有幂等、发布额度和总开关。
8. 为 API 设置日用量与预算熔断，真实计费以供应商账单为准。
9. Docker Compose 安全部署：数据卷、healthcheck、restart policy、仅私网开放管理端口、避免 root 运行 AI 服务；测试流程/备份/回滚。
10. 先跑 Mock + typecheck + tests；未经真实凭据的实机验证不应声称“已上线”。

## 仅 iPhone 的验收顺序
- A：确认模型/API 使用地区与供应商资格。
- B：确认服务器机型和地区，支持 Docker 权限，费用满意后由用户自己购买。
- C：Safari 进云控制台 SSH/VNC 或 iOS SSH 客户端；安装 Docker/Tailscale；不得将管理端口裸露公网。
- D：运行官方 SnowLuma 容器；从受保护 noVNC 登录独立测试 QQ。
- E：通过本机内部 OneBot API 实现对指定 QQ 私聊。
- F：挂接经过测试的 AI 适配器，确认回复与费用熔断。
- G：增加记忆、日记；最后用匿名测试说说，双账号核验 QQ 空间仅指定好友可见。
- H：旧 Railway 服务仅在成功迁移并完成数据备份后由用户手动关停。

## 参考
- https://snowluma.github.io/zh/docs/guide/quickstart
- https://snowluma.github.io/zh/docs/api/qzone/send_qzone_msg
- https://cloud.tencent.com/document/product/1207/73452
- https://developers.openai.com/api/docs/models/gpt-6-luna
