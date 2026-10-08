import type { Task, TaskExecutionHarness } from '../types/task';

export type Executor = 'auto' | 'openclaw' | 'hermes' | 'codex';
export interface RuntimeSystem { available?: boolean; configured?: boolean; notes?: string }
export type Systems = Partial<Record<TaskExecutionHarness, RuntimeSystem>>;
export interface Persona { id: string; slug: string; name: string }

export function selectHarness(executor: Executor, systems: Systems): TaskExecutionHarness | null {
  if (executor === 'codex') return null;
  if (executor !== 'auto') return executor;
  if (systems.hermes?.available === true) return 'hermes';
  if (systems.openclaw?.available === true) return 'openclaw';
  return null;
}

export function createSimpleTask(description: string, executor: Executor, systems: Systems, personas: Persona[]): Partial<Task> {
  const text = description.trim();
  if (!text) throw new Error('請輸入任務內容。');
  if (executor === 'codex') throw new Error('Codex 尚未接通；不會建立假派工。');
  const harness = selectHarness(executor, systems);
  if (!harness) throw new Error('目前沒有可用的 Agent；請明確選擇 OpenClaw 或 Hermes 建立待辦。');
  const persona = personas.find(p => p.slug === 'psytino-safe-general');
  if (!persona) throw new Error('安全通用 Persona 尚未配置，請先完成設定。');
  return {
    title: Array.from(text.split(/\n/)[0].replace(/\s+/g, ' ')).slice(0, 60).join(''),
    description: text, status: 'todo', priority: 'normal', agentTypeId: persona.id,
    autoStart: false, autoCreated: false, activeAgent: null,
    executionMode: 'subagent',
    executionProfile: { harness, mode: 'subagent', accessProfile: 'safe', requiredCapabilities: [], allowOverrideAtSpawn: false, planningMode: 'fixed' },
    definitionOfDone: ['按完整描述完成要求；未能完成的項目必須列出。', '以實際測試或可核對證據驗證成果。', '保存結果摘要、驗證、錯誤及相關 Report。'],
    constraints: ['遵守 Task ownership；未領取不得執行。', '不自動授予 elevated 權限，不修改 Gateway 或 credentials。', '涉及人類決策時停止，記錄問題、選項、推薦及風險。'],
    tags: ['ai-workspace'], notes: '由 AI 工作中心建立；自動領取關閉。等待經驗證的領取／執行機制。',
    subtasks: [], links: [], sessionRefs: [], blockedBy: [], dependsOn: [], maxRetries: 0,
  };
}

export function progressLabel(task: Task): string {
  if (task.status === 'completed') return '已完成';
  if (task.status === 'archived') return '已封存';
  if (task.status === 'review') return '等待審核';
  if (task.status === 'stuck') return parseDecision(task.notes) ? '等待用戶決定' : '失敗／受阻';
  if (task.status === 'in-progress') return '執行中';
  if (task.activeAgent) return '已領取';
  return '等待執行';
}

export interface HumanDecision { question: string; options: { label: string; text: string }[]; recommendation?: string; risk?: string }
export function parseDecision(notes?: string): HumanDecision | null {
  const match = notes?.match(/\[AI_WORKSPACE_DECISION\]\s*([\s\S]*?)\s*\[\/AI_WORKSPACE_DECISION\]/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    if (typeof value.question !== 'string' || !Array.isArray(value.options) || value.options.length < 2 || value.options.length > 4) return null;
    if (!value.options.every((o: { label: string; text: string }) => typeof o.label === 'string' && typeof o.text === 'string')) return null;
    if (new Set(value.options.map((o: { label: string }) => o.label)).size !== value.options.length) return null;
    return { question: value.question, options: value.options, recommendation: typeof value.recommendation === 'string' ? value.recommendation : undefined, risk: typeof value.risk === 'string' ? value.risk : undefined };
  } catch { return null; }
}
