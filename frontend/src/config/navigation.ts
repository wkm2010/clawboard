import { t } from '../i18n/translate';
import { 
  Home, 
  ListTodo, 
  FolderKanban, 
  BookOpen, 
  Wand2, 
  Activity, 
  BarChart3,
  Wrench,
  Radio,
  Briefcase,
  ClipboardList,
  Newspaper,
  Mic,
  Bot,
  Brain,
  LucideIcon
} from 'lucide-react';

/**
 * Navigation configuration - Single source of truth for all navigation items.
 * Used by Sidebar and Dashboard HeroCard quick actions.
 */

/** Sidebar menu group identifiers */
export type NavGroup = 'main' | 'workspace';

export interface NavItem {
  /** Unique identifier for the nav item */
  id: string;
  /** Route path (e.g., '/tasks') */
  path: string;
  /** Display label in sidebar */
  label: string;
  /** Optional alternate label for dashboard quick actions */
  heroLabel?: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Whether to show in sidebar navigation */
  showInSidebar: boolean;
  /** Whether to show in dashboard hero quick actions */
  showInHero: boolean;
  /** Sort order (lower = first) */
  order: number;
  /** Sidebar group — 'main' (always visible) or 'workspace' (collapsible) */
  group: NavGroup;
}

/** Group metadata for rendering collapsible sections */
export interface NavGroupMeta {
  id: NavGroup;
  label: string;
  icon: LucideIcon;
  /** Whether the group is collapsible */
  collapsible: boolean;
  /** Default collapsed state */
  defaultCollapsed: boolean;
  order: number;
}

export const navGroups: NavGroupMeta[] = [
  { id: 'main', label: t('Main'), icon: Home, collapsible: false, defaultCollapsed: false, order: 0 },
  { id: 'workspace', label: t('Workspace'), icon: Briefcase, collapsible: true, defaultCollapsed: false, order: 1 },
];

/**
 * All navigation items in the application.
 * Add new pages here and they'll automatically appear in both sidebar and hero.
 */
export const navigationItems: NavItem[] = [
  {
    id: 'ai-workspace', path: '/ai-workspace', label: 'AI 工作中心', icon: Bot,
    showInSidebar: true, showInHero: true, order: 0.5, group: 'main',
  },
  // === Main group (always visible, not collapsible) ===
  {
    id: 'dashboard',
    path: '/',
    label: t('Dashboard'),
    icon: Home,
    showInSidebar: true,
    showInHero: false,
    order: 0,
    group: 'main',
  },
  {
    id: 'sessions',
    path: '/sessions',
    label: t('Sessions'),
    icon: Radio,
    showInSidebar: true,
    showInHero: true,
    order: 1,
    group: 'main',
  },
  {
    id: 'tasks',
    path: '/tasks',
    label: t('Tasks'),
    heroLabel: t('On My Mind'),
    icon: ListTodo,
    showInSidebar: true,
    showInHero: true,
    order: 2,
    group: 'main',
  },
  {
    id: 'projects',
    path: '/projects',
    label: t('Projects'),
    icon: FolderKanban,
    showInSidebar: true,
    showInHero: true,
    order: 3,
    group: 'main',
  },
  {
    id: 'reports',
    path: '/reports',
    label: t('Reports'),
    icon: ClipboardList,
    showInSidebar: true,
    showInHero: true,
    order: 4,
    group: 'main',
  },
  {
    id: 'content-engine',
    path: '/content-engine',
    label: t('Content Engine'),
    icon: Newspaper,
    showInSidebar: true,
    showInHero: true,
    order: 5,
    group: 'main',
  },
  {
    id: 'journal',
    path: '/journal',
    label: t('Journal'),
    icon: BookOpen,
    showInSidebar: true,
    showInHero: true,
    order: 5,
    group: 'main',
  },

  {
    id: 'voice',
    path: '/voice',
    label: t('Voice'),
    icon: Mic,
    showInSidebar: true,
    showInHero: true,
    order: 6,
    group: 'main',
  },

  // === Workspace group (collapsible) ===
  {
    id: 'images',
    path: '/images',
    label: t('Images'),
    icon: Wand2,
    showInSidebar: true,
    showInHero: true,
    order: 10,
    group: 'workspace',
  },
  {
    id: 'tools',
    path: '/tools',
    label: t('Tools'),
    icon: Wrench,
    showInSidebar: true,
    showInHero: true,
    order: 10,
    group: 'workspace',
  },
  {
    id: 'agent-types',
    path: '/agent-types',
    label: t('Agent Types'),
    heroLabel: t('Agents'),
    icon: Bot,
    showInSidebar: true,
    showInHero: true,
    order: 11,
    group: 'workspace',
  },
  {
    id: 'audit',
    path: '/audit',
    label: t('Audit Log'),
    icon: Activity,
    showInSidebar: true,
    showInHero: true,
    order: 10,
    group: 'workspace',
  },
  {
    id: 'stats',
    path: '/stats',
    label: t('Stats'),
    icon: BarChart3,
    showInSidebar: true,
    showInHero: true,
    order: 10,
    group: 'workspace',
  },
  {
    id: 'second-brain',
    path: '/second-brain',
    label: t('Second Brain'),
    icon: Brain,
    showInSidebar: true,
    showInHero: true,
    order: 12,
    group: 'workspace',
  },
];

/**
 * Get navigation items for sidebar (filtered and sorted)
 */
export const getSidebarNavItems = (): NavItem[] => {
  return navigationItems
    .filter(item => item.showInSidebar)
    .sort((a, b) => a.order - b.order);
};

/**
 * Get sidebar items grouped by their NavGroup
 */
export const getSidebarGroups = (): { group: NavGroupMeta; items: NavItem[] }[] => {
  return navGroups
    .sort((a, b) => a.order - b.order)
    .map(group => ({
      group,
      items: getSidebarNavItems().filter(item => item.group === group.id),
    }))
    .filter(g => g.items.length > 0);
};

/**
 * Get navigation items for hero quick actions (filtered and sorted)
 */
export const getHeroNavItems = (): NavItem[] => {
  return navigationItems
    .filter(item => item.showInHero)
    .sort((a, b) => a.order - b.order);
};

/**
 * Get display label for a nav item (uses heroLabel if available and in hero context)
 */
export const getNavLabel = (item: NavItem, context: 'sidebar' | 'hero' = 'sidebar'): string => {
  if (context === 'hero' && item.heroLabel) {
    return item.heroLabel;
  }
  return item.label;
};
