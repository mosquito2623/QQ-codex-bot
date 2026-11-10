// Real SDK workers must implement this boundary in an independently sandboxed service.
// No child_process, shell tool, host mount, Docker socket, or environment export is exposed here.
export interface CodingAgent {readonly mode:'disabled'|'isolated-sdk'; run(task:string):Promise<string>}
export class DisabledCodex implements CodingAgent {
 readonly mode='disabled' as const;
 async run(_task:string){return '真正的 Codex Agent 执行尚未启用：缺少已验证的独立沙箱和授权。当前聊天可解释或生成代码，但不会运行代码、修改仓库或部署。';}
}
