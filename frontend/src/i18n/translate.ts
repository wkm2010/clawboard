import { en } from './en';
import { zhHant } from './zh-Hant';
import { DEFAULT_LOCALE } from './index';

const navigation: Record<string, string> = { Main: '主要功能', Workspace: '工作區', Dashboard: '儀表板', Tasks: '任務', Projects: '專案', Reports: '報告', Sessions: '工作階段', Journal: '日誌', 'Second Brain': '第二大腦', Stats: '統計', Tools: '工具', 'Audit Log': '稽核記錄', 'Agent Types': 'Agent 類型', 'Content Engine': '內容中心', Voice: '語音', Images: '圖片', 'On My Mind': '待處理', Agents: 'Agent' };
export function t(key: string, locale: string = DEFAULT_LOCALE): string {
  void en; void zhHant;
  return locale === 'zh-Hant' ? (navigation[key] ?? key) : key;
}
