import { describe, it, expect } from 'vitest';
import { createSimpleTask, selectHarness, progressLabel, parseDecision } from './aiWorkspaceModel';
import type { Task } from '../types/task';
const personas = [{ id: 'persona-real-id', slug: 'psytino-safe-general', name: '安全通用工作助手' }];
describe('AI workspace safe additive workflow', () => {
  it('auto selects only live agents, preferring Hermes', () => {
    expect(selectHarness('auto', { openclaw: { available: true }, hermes: { available: false } })).toBe('openclaw');
    expect(selectHarness('auto', { openclaw: { available: true }, hermes: { available: true } })).toBe('hermes');
    expect(selectHarness('auto', { openclaw: { configured: true } })).toBeNull();
  });
  it('offline explicit harness can queue safely without execution', () => {
    const task = createSimpleTask('檢查系統\n保留完整要求', 'hermes', {}, personas);
    expect(task).toMatchObject({ title: '檢查系統', description: '檢查系統\n保留完整要求', status: 'todo', priority: 'normal', autoStart: false, activeAgent: null, agentTypeId: 'persona-real-id', executionProfile: { harness: 'hermes', accessProfile: 'safe', allowOverrideAtSpawn: false, requiredCapabilities: [] } });
  });
  it('fails closed when Auto has no available harness', () => { expect(() => createSimpleTask('test', 'auto', {}, personas)).toThrow('沒有可用'); });
  it('does not fabricate a Codex harness', () => { expect(() => createSimpleTask('test', 'codex', {}, personas)).toThrow('尚未接通'); });
  it('requires a real configured safety persona', () => { expect(() => createSimpleTask('test', 'hermes', {}, [])).toThrow('Persona'); });
  it('requires nonempty natural language', () => { expect(() => createSimpleTask(' ', 'hermes', {}, personas)).toThrow('輸入'); });
  it('uses backend status, no optimistic simulated progress', () => {
    expect(progressLabel({ status: 'todo', autoStart: false } as Task)).toBe('等待執行');
    expect(progressLabel({ status: 'in-progress' } as Task)).toBe('執行中');
    expect(progressLabel({ status: 'completed' } as Task)).toBe('已完成');
    expect(progressLabel({ status: 'stuck' } as Task)).toBe('失敗／受阻');
  });
  it('recognizes only explicit valid human decision data', () => {
    expect(parseDecision('some notes')).toBeNull();
    expect(parseDecision('[AI_WORKSPACE_DECISION]{invalid}[/AI_WORKSPACE_DECISION]')).toBeNull();
    const gate = { question: '請選擇', options: [{ label: 'A', text: '保留' }, { label: 'B', text: '停止' }], recommendation: 'A' };
    const notes = `[AI_WORKSPACE_DECISION]${JSON.stringify(gate)}[/AI_WORKSPACE_DECISION]`;
    expect(parseDecision(notes)).toEqual({ ...gate, risk: undefined });
    expect(progressLabel({ status: 'stuck', notes } as Task)).toBe('等待用戶決定');
  });
});
