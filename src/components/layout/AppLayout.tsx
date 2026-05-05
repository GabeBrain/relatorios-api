import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Map,
  FileText,
  FlaskConical,
  Building2,
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  BarChart2,
  Wrench,
  ClipboardList,
  Users,
  Database,
} from 'lucide-react';
import { AuthBlock } from './AuthBlock';
import brainLogo from '../../../assets/logoBrain.png';
import { cn } from '@/lib/utils';

interface NavItem {
  type?: 'item';
  path: string;
  label: string;
  icon: React.ReactNode;
  standby?: boolean;
  standbyLabel?: string;
}

interface NavFolder {
  type: 'folder';
  id: string;
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
}

type NavEntry = NavItem | NavFolder;

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavEntry[];
}

const TOP_ITEMS: NavItem[] = [
  { path: '/documentacao', label: 'Documentação', icon: <FileText className="h-4 w-4" /> },
  { path: '/testes-requisicao', label: 'Testes de Requisição', icon: <FlaskConical className="h-4 w-4" /> },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: <BarChart2 className="h-4 w-4" />,
    items: [
      { path: '/relatorios-secovi', label: 'Relatório Secovi', icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    id: 'suporte-clientes',
    label: 'Suporte Clientes',
    icon: <Users className="h-4 w-4" />,
    items: [
      {
        type: 'folder',
        id: 'cliente-piemonte',
        label: 'Piemonte',
        icon: <Building2 className="h-4 w-4" />,
        children: [
          { path: '/testes-qualidade/piemonte-vgv', label: 'VGV Verticais', icon: <ClipboardList className="h-4 w-4" /> },
          { path: '/testes-qualidade/piemonte-release-price', label: 'Release price', icon: <ClipboardList className="h-4 w-4" /> },
        ],
      },
    ],
  },
  {
    id: 'testes-qualidade',
    label: 'Testes de Qualidade',
    icon: <ClipboardList className="h-4 w-4" />,
    items: [
      {
        type: 'folder',
        id: 'cid',
        label: 'CID',
        icon: <Database className="h-4 w-4" />,
        children: [
          { path: '/testes-qualidade/cid-validacao-base', label: 'Validação de Base', icon: <ClipboardList className="h-4 w-4" /> },
        ],
      },
    ],
  },
  {
    id: 'em-implementacao',
    label: 'Em implementação',
    icon: <Wrench className="h-4 w-4" />,
    items: [
      { path: '/assistente', label: 'Assistente', icon: <Bot className="h-4 w-4" /> },
      { path: '/mapa', label: 'Mapa', icon: <Map className="h-4 w-4" />, standbyLabel: '(testes)' },
    ],
  },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
  }
  return { dark, toggle };
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, false]))
  );
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const { dark, toggle } = useDarkMode();
  const location = useLocation();

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleFolder(id: string) {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isFolder(entry: NavEntry): entry is NavFolder {
    return entry.type === 'folder';
  }

  function isActiveItem(item: NavItem) {
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  }

  function isActiveEntry(entry: NavEntry): boolean {
    return isFolder(entry) ? entry.children.some(isActiveItem) : isActiveItem(entry);
  }

  function renderNavItem(item: NavItem) {
    const isActive = isActiveItem(item);
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          collapsed && 'justify-center px-0 py-2.5'
        )}
        title={collapsed ? item.label : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
        {!collapsed && (
          <span className="truncate">
            {item.label}
            {item.standbyLabel && (
              <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                {item.standbyLabel}
              </span>
            )}
          </span>
        )}
      </NavLink>
    );
  }

  function renderNavEntry(entry: NavEntry) {
    if (!isFolder(entry)) return renderNavItem(entry);

    const hasActiveChild = entry.children.some(isActiveItem);
    const isOpen = (openFolders[entry.id] ?? false) || hasActiveChild;

    return (
      <div key={entry.id} className="space-y-0.5">
        <button
          type="button"
          onClick={() => !collapsed && toggleFolder(entry.id)}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
            hasActiveChild
              ? 'text-primary font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0 py-2.5'
          )}
          title={collapsed ? entry.label : undefined}
        >
          <span className="shrink-0">{entry.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{entry.label}</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
              />
            </>
          )}
        </button>

        {!collapsed && isOpen && (
          <div className="ml-3 pl-2 border-l border-border space-y-0.5">
            {entry.children.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col h-full border-r border-border bg-card transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-64'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn('flex items-center gap-2 px-3 py-3 border-b border-border', collapsed ? 'justify-center px-2' : 'justify-between')}>
          <div className="flex items-center gap-2 min-w-0">
            <img src={brainLogo} alt="Brain" className="h-7 w-auto shrink-0" />
            {!collapsed && (
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate">API Studio</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Top-level items (sem categoria) */}
          {TOP_ITEMS.map(renderNavItem)}

          {/* Grupos com categoria */}
          {NAV_GROUPS.map((group) => {
            const hasActiveChild = group.items.some(isActiveEntry);
            const isOpen = (openGroups[group.id] ?? false) || hasActiveChild;

            return (
              <div key={group.id} className="mt-2">
                <button
                  type="button"
                  onClick={() => !collapsed && toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    hasActiveChild
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-0 py-2.5'
                  )}
                  title={collapsed ? group.label : undefined}
                >
                  <span className="shrink-0">{group.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate text-xs font-semibold uppercase tracking-wider">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="mt-0.5 ml-3 pl-2 border-l border-border space-y-0.5">
                    {group.items.map(renderNavEntry)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Auth block */}
        {!collapsed && (
          <div className="border-t border-border p-3">
            <AuthBlock />
          </div>
        )}

        {/* Footer: dark mode only */}
        <div className="flex items-center justify-center border-t border-border p-2">
          <button
            type="button"
            onClick={toggle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={dark ? 'Modo claro' : 'Modo escuro'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
