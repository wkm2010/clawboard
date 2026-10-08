import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../utils/auth';
import type { Task } from '../types/task';
import { createSimpleTask, parseDecision, progressLabel, type Executor, type Persona, type Systems } from './aiWorkspaceModel';
import './AIWorkspacePage.css';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
interface Report { id: string; title: string; summary?: string; task_ids?: string[] }
async function request(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok || data.success === false) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export function AIWorkspacePage() {
  const [text, setText] = useState('');
  const [executor, setExecutor] = useState<Executor>('auto');
  const [systems, setSystems] = useState<Systems>({});
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [decisionText, setDecisionText] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [runtime, agents, taskData] = await Promise.all([
        request('/models/status'), request('/agent-types'), request('/tasks?includeArchived=true'),
      ]);
      setSystems(runtime.systems || {}); setPersonas(agents.agentTypes || []); setTasks(taskData.tasks || []);
      const allReports: Report[] = [];
      let offset = 0;
      for (;;) {
        const data = await request(`/reports?limit=100&offset=${offset}`);
        const batch: Report[] = data.reports || []; allReports.push(...batch);
        if (!data.hasMore) break;
        if (!batch.length) throw new Error('報告分頁回傳不完整。');
        offset += batch.length;
      }
      setReports(allReports); setError(''); setLoaded(true);
    } catch (e) { setSystems({}); setError(`無法取得最新資料：${e instanceof Error ? e.message : String(e)}`); }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 15000); return () => clearInterval(timer); }, [refresh]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setNotice('');
    try {
      // Re-check live availability and configured persona at submission, not cached UI state.
      const [runtime, agents] = await Promise.all([request('/models/status'), request('/agent-types')]);
      const payload = createSimpleTask(text, executor, runtime.systems || {}, agents.agentTypes || []);
      const result = await request('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!result.task?.id) throw new Error('Backend 未回傳真實 Task ID。');
      const saved = await request(`/tasks/${result.task.id}`);
      if (saved.task?.status !== 'todo' || saved.task?.autoStart !== false) throw new Error('任務已建立，但安全預設核對失敗，請查看原有任務詳細資料。');
      setText(''); setNotice(`已建立任務 ${result.task.id}，等待執行；沒有啟動 Agent。`); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function saveDecision(task: Task) {
    if (busy) return;
    const gate = parseDecision(task.notes);
    const selected = choices[task.id];
    const option = gate?.options.find(o => o.label === selected);
    const answer = gate ? option && `${option.label}. ${option.text}` : decisionText[task.id]?.trim();
    if (!answer) { setError('請選擇選項或輸入決策。'); return; }
    setBusy(true);
    try {
      const latest: Task = (await request(`/tasks/${task.id}`)).task;
      if (latest.updated !== task.updated || latest.status !== 'stuck') throw new Error('任務已變更；請重新整理後確認，未覆寫新內容。');
      const marker = `[HUMAN_DECISION ${new Date().toISOString()}]\n${answer}\n決策已記錄；未自動恢復執行。`;
      await request(`/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: `${latest.notes || ''}\n\n${marker}` }) });
      const verified = (await request(`/tasks/${task.id}`)).task;
      if (!verified.notes?.includes(marker)) throw new Error('決策回寫未能核對。');
      setNotice('決策已寫回原有 Task。沒有已驗證的通用 resume API，本頁不會宣稱已恢復；請從原有任務入口處理。');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return <section className="ai-workspace">
    <h1>AI 工作中心</h1>
    <p>簡易派工入口；與原有任務看板共用同一資料庫。<Link to="/tasks">開啟完整任務看板及新增表單</Link></p>
    <div className="ai-runtime" aria-label="Agent 狀態">
      {(['openclaw', 'hermes'] as const).map(id => <span key={id}>{id === 'openclaw' ? 'OpenClaw' : 'Hermes'}：<strong>{systems[id]?.available === true ? 'LIVE' : 'DOWN'}</strong></span>)}
      <span>Codex：尚未接通（未配置原生執行器）</span>
    </div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form onSubmit={submit}>
      <label htmlFor="ai-task-description">你想完成甚麼？</label>
      <textarea id="ai-task-description" value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={20000} required placeholder="例如：檢查服務狀態，整理需要處理的問題，不修改配置。" />
      <label htmlFor="ai-executor">執行者</label>
      <select id="ai-executor" value={executor} onChange={e => setExecutor(e.target.value as Executor)}>
        <option value="auto">Auto（只分配給實際可用的 Agent）</option><option value="openclaw">OpenClaw</option><option value="hermes">Hermes</option><option value="codex" disabled>Codex — 尚未接通</option>
      </select>
      <button type="submit" disabled={busy || !loaded}>{busy ? '處理中…' : '建立任務'}</button>
      <p>預設：待辦、一般優先級、安全權限、自動領取關閉。離線 Agent 的任務只會排隊，不會假裝執行。{!personas.some(p => p.slug === 'psytino-safe-general') && ' 安全 Persona 尚未配置。'}</p>
    </form>
    <div className="ai-task-toolbar"><h2>工作進度（全部原有任務）</h2><button onClick={() => void refresh()} disabled={busy}>重新整理</button><input aria-label="搜尋任務" placeholder="搜尋任務" value={filter} onChange={e => setFilter(e.target.value)} /></div>
    {!loaded ? <p>正在載入真實任務資料…</p> : tasks.filter(t => `${t.title} ${t.description}`.includes(filter)).map(task => {
      const gate = parseDecision(task.notes);
      const actor = task.completedBy || task.activeAgent;
      const name = typeof actor === 'string' ? actor : actor?.name;
      const related = reports.filter(r => r.task_ids?.includes(task.id) || task.links?.some(l => l.type === 'report' && l.url.includes(r.id)));
      return <article key={task.id} className="ai-task-card">
        <h3><Link to={`/tasks/${task.id}`}>{task.title}</Link></h3>
        <p><strong>{progressLabel(task)}</strong> · 指定執行器：{task.executionProfile?.harness || '未指定'} · 執行者：{name || '未有執行者證據'}</p>
        <p>完成時間：{task.completedAt || task.completed || '尚未完成'}</p>
        {task.blockedReason && <p>錯誤／受阻原因：{task.blockedReason}</p>}
        {task.status === 'completed' && <p>結果摘要：{related[0]?.summary || '未有結果摘要；請查看完整 Task／Report。'}</p>}
        <ul>{related.map(report => <li key={report.id}><Link to={`/reports/${report.id}`}>{report.title}</Link></li>)}</ul>
        {task.status === 'completed' && !related.length && <p>未有相關 Report。</p>}
        <details><summary>任務內容、錯誤及未完成事項</summary><p className="ai-prewrap">{task.description}</p><p className="ai-prewrap">{task.notes || '沒有備註'}</p></details>
        {task.status === 'stuck' && <div className="ai-human-gate">
          <h4>人類決策</h4><p className="ai-prewrap">{gate?.question || task.blockedReason || '請查看任務備註中的受阻原因。'}</p>
          {gate ? <><p>AI 推薦：{gate.recommendation || '未提供'}</p>{gate.risk && <p>風險：{gate.risk}</p>}{gate.options.map(o => <label key={o.label}><input type="radio" name={`decision-${task.id}`} value={o.label} checked={choices[task.id] === o.label} onChange={() => setChoices(prev => ({ ...prev, [task.id]: o.label }))} />{o.label}. {o.text}</label>)}</> : <><p>Backend 未提供結構化選項；不會編造 A／B／C。可記錄你的決策。</p><textarea aria-label={`決策 ${task.title}`} value={decisionText[task.id] || ''} onChange={e => setDecisionText(prev => ({ ...prev, [task.id]: e.target.value }))} /></>}
          <button disabled={busy} onClick={() => void saveDecision(task)}>確認並記錄決策（不自動恢復）</button>
        </div>}
        <Link to={`/tasks/${task.id}`}>查看原有 Task 詳細資料</Link>
      </article>;
    })}
    {loaded && !tasks.length && <p>目前沒有任務。</p>}
  </section>;
}
