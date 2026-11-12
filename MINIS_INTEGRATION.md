# 小知遥 V3 · Open Minis 纳入流程（2026-11-12）

## 角色分工：不要把手机当 24/7 QQ 服务器

| 组件 | 角色 | 是否需要常驻 |
| --- | --- | --- |
| iPhone 上的 Open Minis | 手机端草稿/人设/测试工作台；未来也可辅助管理远程 VPS | 不需要 |
| GitHub + Codex | 开发和测试代码、保存无秘密的规则 | 不需要 |
| Linux VPS | NapCat 普通 QQ 登录、24/7 私聊回复、SQLite 记忆、调度 | 正式上线时需要 |
| OpenAI GPT-6 Luna API | **唯一指定的正式聊天模型** | 正式功能必须能合法调用 |

Minis 是客户端，不向 NapCat 自然提供可公网访问的推理服务。Minis 的 iOS Linux 沙箱没有常驻 Docker/QQ 的保证；iOS 后台挂起影响定时任务/消息收发。不可用 Minis 消除服务器需求，也不能用已登录 ChatGPT 或 Minis 来免除 API 计费。OpenAI 的使用资格必须遵守支持地区政策。

## 立即免费可做的 Minis 预演

1. 手机上打开 Open Minis：App Store https://apps.apple.com/us/app/open-minis/id6759188481
2. 向 Minis 聊天输入本仓库 Skills 文件的网址：
   https://github.com/mosquito2623/QQ-codex-bot/blob/feature/napcat-gpt6-luna-companion/minis/xiaozhiyao-preview/SKILL.md
3. 按 Minis 的导入提示确认安装，检查 Settings → Skills 是否出现 `xiaozhiyao-preview`，在测试会话启用。
4. 先使用已配置的模型做**只测试文案和流程**的预演；不是正式 GPT-6 Luna，须标注当前实际模型。
5. 可先请求：
   - “请按小知遥预演技能写一篇**虚构测试**日记（约200字），不要声称真实发生。”
   - “请把下面这段**虚构** QQ 聊天生成私人动态草稿，只输出草稿，不发布。”
   - “请列出以后小知遥记忆库要保存的字段，不要上传真实私人数据。”
6. 记下自然度、拟人感、日记格式、隐私边界的改进建议；在 Codex 里更新相应规则并运行单元测试。

## 充值与真实 Luna API 验收阶段（未来）
- 确认 OpenAI 账户/项目、使用者位置和访问资格符合官方 supported countries；换服务器地区本身不等于合规资格。
- 账户余额当前不足时不要发送需要付费的 Luna 真实请求。
- 充值后，可以 **在 Minis 自己的 OpenAI provider** 输入自己的 API Key，选择准确模型 `gpt-6-luna`，使用官方 API 基址 `https://api.openai.com/v1`；如模型列表未列出则手动输入。确认 Minis 版本和实际 API 格式支持后小量测试。
- Minis 中的 API Key **不会自动传给 Linux VPS**。正式部署时由用户在 VPS 的私密环境变量中独立配置，不写进公开 GitHub。
- 任何 ChatGPT 账号登录或 Minis 现有 DeepSeek 连接，都**不能保证/替代**给 QQ 小知遥的独立 GPT-6 Luna API 计费授权。

## VPS 上线阶段
1. 继续在 GitHub 的 `feature/napcat-gpt6-luna-companion` 分支开发 OneBot WS、消息去重、存储、日记调度和 Docker Compose；不得在旧 official QQ 群机器人代码上直接破坏性修改。
2. 用本地 Mock（不耗 API）验收。
3. 在网络、容器资源、OpenAI 支持地区资格和 QQ 账号风险确认后再买 VPS。
4. iPhone 用安全 SSH/Tailscale 管理 VPS，Minis 可作操作说明和测试记录助手，但关键部署命令应先人工核对，远程管理口不公开。
5. 正式环境 QQ→NapCat→Node 服务→GPT-6 Luna→Node→NapCat→QQ，**不经过 Minis**，不受 iPhone 锁屏影响。
6. 私人日记先本地保存；QQ 空间指定好友可见功能另做双号权限验收，绝不默认公开发布。

## 官方依据
- https://openminis.app/
- https://github.com/OpenMinis/OpenMinis
- https://github.com/OpenMinis/AwesomeMinis/blob/main/cases/productivity/shortcuts-scheduled-task.md
- https://github.com/NapNeko/NapCat-Docker
- https://developers.openai.com/api/docs/supported-countries
- https://developers.openai.com/api/docs/models/gpt-6-luna
