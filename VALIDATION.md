# 验证记录

执行日期：2026-11-10。环境：Node v24.22.1、npm 11.9.0；本机测试，不是QQ生产部署。

| 操作 | 结果 |
|---|---|
| `npm install --ignore-scripts` | 成功安装42个包并生成package-lock.json |
| `npm run typecheck` | 通过 |
| `npm test` | 36/36通过 |
| `npm run build` | 通过，生成dist |
| `npm run security` | 静态执行/凭证检查通过；npm audit报告0漏洞 |
| `node dist/index.js`（无必填配置） | 预期退出1，提示缺少QQ_GROUP_ALLOWLIST，不输出任何密钥 |
| `docker build -t qq-codex-bot:local .` | 未执行构建：docker命令不存在，退出127 |
| `gh auth status` | CLI未登录 |
| GitHub连接仓库查询 | 返回空列表；未推送远端 |
| QQ/OpenAI真实请求 | 未运行，凭证缺失 |
| 云部署/入群/真实收发 | 未完成 |

测试覆盖：@事件识别、非触发忽略、自身/其他机器人忽略、过期/畸形事件、群白名单、重复事件、上下文更新/隔离/数量/过期、管理员验证、code/reset普通成员拒绝、reset隔离、启停、SDK禁用说明、AI失败回退、超长输入、用户/群频率限制、每日次数与预估费用预算、输出秘密脱敏、磁盘重开恢复缓存任务、队列背压、缺配置/通配符拒绝、日志与脱敏、官方Ed25519公钥向量、篡改/过期签名、challenge签名、官方发消息参数/401刷新、429退避保持同seq、HTTP200业务错误、并发token复用、Responses参数、真实本地HTTP验签ACK与重投去重。

没有测试WebSocket重连：项目选用官方Webhook，测试的是同等故障场景下的重投与重启恢复。未运行Docker镜像启动和云卷权限实测，CI中提供后续docker build。未运行模型可用性、QQ审核/权限、IP白名单或真实消息投递测试。安全检查不能代替渗透测试和部署审查。

早期测试曾发现测试Mock类型错误和官方签名示例原始正文空白无法可靠对应；已修复Mock类型，并改用官方明确列出的公钥向量验证密钥派生，另独立测试实际签名/篡改校验。未把失败记录计为通过。
