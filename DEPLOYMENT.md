# iPhone 部署与授权

当前没有创建公网服务或购买任何套餐。已获授权访问GitHub仓库 https://github.com/mosquito2623/QQ-codex-bot ，正在通过连接上传项目；CLI未登录，不影响连接方式提交。当前环境没有Docker CLI/daemon和云服务连接，不能把本任务临时环境当作长期托管。

## A 已自动完成

项目代码、依赖锁定、官方接口核对、Mock测试、类型检查、构建、静态安全检查与依赖审计、Docker/Compose、Railway配置和GitHub CI准备。已初始化本地Git并提交，项目交付目标为上述GitHub仓库。

## B QQ 平台（必须由你操作）

1. iPhone Safari打开 https://q.qq.com/ （官方入口 https://bot.q.qq.com/open ）。使用自己的QQ登录，按页面要求完成开发者认证，创建机器人，名称填 `Codex`。具体群能力、认证和上架资格以当前账号后台为准；程序无法代替审核。
2. 打开该机器人开发设置，找到AppID/AppSecret。只把它们填入云服务Variables，不发到聊天、截图或仓库。
3. 为测试群开启沙箱/测试范围和群聊能力，申请/订阅 `GROUP_AT_MESSAGE_CREATE`。不要默认申请全量群消息能力。确认群在本账号允许安装的范围内，用平台提供的添加/测试入口让群主添加机器人。
4. 事件回调配置页面 https://q.qq.com/qqbot/#/developer/webhook-setting （如后台路由调整，从开发设置进入）。回调填 `https://你的服务域名/qq/webhook`；HTTPS外部端口443。平台验证通过才算回调建立。
5. 若启用IP白名单，添加云服务固定**出口**IPv4；不是域名解析出的入口IP。新机器人可能默认要求IP白名单。完成后重新测试API调用。
6. 群和成员标识必须使用官方 `group_openid` / `author.member_openid`，不能填QQ号或群号。若后台事件调试能看到这两个字段，记录到Variables；否则按下面临时发现模式获取。

临时发现模式：先配置QQ两个凭证、`SETUP_MODE=true` 和云服务启动命令 `node dist/setup.js`。配置Webhook并让群主/管理员 @机器人 发任意测试文字。云部署日志只会出现 `setup_identity` 与两个官方ID，机器人此时不会AI回复。将它们分别填到 `QQ_GROUP_ALLOWLIST` 和 `QQ_ADMIN_OPENIDS`。完成后删除SETUP_MODE，恢复启动命令 `node dist/index.js`，清理配置阶段日志；此后应用按精确白名单运行。角色字段缺失时不要降低校验，使用平台调试信息取得身份。

## C OpenAI（必须由你授权）

1. 进入 https://platform.openai.com/ ，确认你自己的组织/项目具备API访问资格。
2. 打开 https://platform.openai.com/api-keys 创建专用于此机器人的项目密钥；也可以在后续对话授权安全密钥配置流程。只写入云服务 `OPENAI_API_KEY`，不要粘贴到聊天。
3. 在项目中确认可用模型，将准确模型ID填 `OPENAI_MODEL`。ChatGPT Plus不是通用API额度；不要假定订阅覆盖机器人调用。
4. 在 https://platform.openai.com/settings/organization/billing/overview 检查计费，任何充值由你自行决定；此项目不启用自动充值。
5. 在 https://developers.openai.com/api/docs/pricing 核实所选模型每百万输入/输出Token单价，填 `INPUT_USD_PER_MILLION`、`OUTPUT_USD_PER_MILLION`；自行设定 `DAILY_BUDGET_USD`。它们必须为正数。设置项目预算提醒、调用限额和尽可能小的密钥权限。
6. 先确认账户/使用地区符合 https://developers.openai.com/api/docs/supported-countries 。部署地变化不能代替账户资格，也不要使用代理绕过服务地区限制。

## D GitHub 与云服务（必须由你授权）

最短免本地终端路径：

1. Safari打开 https://github.com/new ，新建**私有**仓库 `qq-codex-bot`，勾选添加README，使仓库有初始分支。在ChatGPT的GitHub连接授权中允许访问这个仓库，把仓库链接发回来。之后可由我上传项目代码和CI；你无需用手机逐个粘贴文件。不要直接把ZIP作为仓库源码提交（部署平台不会自动解压）。
2. 打开 https://railway.com/dashboard ，用GitHub登录，New Project → Deploy from GitHub repo，选择上面仓库。此步骤应在代码已推送后进行。任何付费计划先查看价格、自行决定；此项目没有代购授权。
3. 服务Variables页填必填变量：QQ_APP_ID、QQ_APP_SECRET、OPENAI_API_KEY、OPENAI_MODEL、QQ_GROUP_ALLOWLIST、QQ_ADMIN_OPENIDS、DAILY_BUDGET_USD、INPUT_USD_PER_MILLION、OUTPUT_USD_PER_MILLION。默认其余值见.env.example；`DB_PATH=/app/data/bot.sqlite`，`PORT=8080`。
4. 服务添加持久Volume，挂载 `/app/data`。运行用户node必须对挂载目录可写；若出现数据库权限报错，应在平台卷权限配置或云控制台修复UID1000的写权限，不能用临时目录替代持久化。只运行**1个副本**，更新先停止旧实例再启动新实例。
5. Settings → Networking → Generate Domain，使用生成的HTTPS域名。GET `/healthz` 应返回 `{"ok":true}`（发现模式返回setup）。关闭Serverless/应用休眠，确保服务常驻。
6. 若QQ需要IP白名单，在Networking启用Static Outbound IP并重新部署，记录其出口IP到QQ后台。Railway此能力当前要求Pro套餐；**不应为此自动升级付费计划**。没有该套餐时，选择你已持有、具固定公网出口与HTTPS的合规云服务器，或先完成QQ沙箱验证；不要把动态出口当固定IP。
7. QQ回调验证通过、运行日志出现service_started后，按ACCEPTANCE.md真实验收。失败先看固定错误码；不要把完整日志或请求密钥发给他人。

## Docker 自有服务器路径

这是供后续已授权云服务器/浏览器控制台使用的命令，不要求iPhone本地终端。安装Docker后在项目目录配置私密.env，执行 `docker compose up -d --build`；Compose绑定127.0.0.1:8080，前置HTTPS反向代理只开放443并转发 `/qq/webhook` 和 `/healthz`，不改写原始请求体。Compose自带自动重启、资源限制、持久卷、最小权限和健康检查。

## 更新/回滚/备份

更新前停止新消息接入并等待在途任务结束，停止旧实例，再备份SQLite一致性快照和当前部署版本；不要在同一卷并行启动新旧版本。发布新代码/镜像后查看healthz、日志并做一次群内ping和提问。失败回滚旧镜像；若以后修改数据库schema，必须同时有兼容性迁移方案，不能盲目回滚数据库。备份应加密、限制访问且设自动过期。SIGTERM有75秒退出预算，Compose留80秒停止窗口。卷不是跨区域备份。

## 官方核对依据（2026-11-10）

- https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/access-token.html （现行token域名api.bot.qq.com）
- https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/api-use.html
- https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html
- https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/interface-framework/sign.html
- https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/group_at_message_create.html
- https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html
- https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/overview.html
- https://github.com/tencent-connect/botgo （WebSocket退场提示；现行文档仍有旧章节，不能据此保证账号可用）
- https://developers.openai.com/api/docs/guides/text
- https://learn.chatgpt.com/docs/codex-sdk
- https://learn.chatgpt.com/docs/app-server
- https://docs.railway.com/networking/static-outbound-ips
- https://docs.railway.com/volumes

注意：旧文档仍有api.sgroup.qq.com、bots.qq.com和主动推送停用公告；当前页面存在演进差异。本实现按现行文档仅用新统一域名及被动文本回复，上线时必须通过真实账号校验。QQ群聊权限和手机后台可操作性尚未登录实测，不承诺所有账号具备同样入口。
