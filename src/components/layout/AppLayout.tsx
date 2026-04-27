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
  Moon,
  Sun,
} from 'lucide-react';
import { AuthBlock } from './AuthBlock';
import brainLogo from '../../../assets/logoBrain.png';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  standby?: boolean;
  standbyLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/documentacao', label: 'Documentação', icon: <FileText className="h-4 w-4" /> },
  { path: '/testes-requisicao', label: 'Testes de Requisição', icon: <FlaskConical className="h-4 w-4" /> },
  { path: '/testes-arquitetura', label: 'Testes de Arquitetura', icon: <Building2 className="h-4 w-4" /> },
  { path: '/assistente', label: 'Assistente', icon: <Bot className="h-4 w-4" />, standby: true },
  { path: '/mapa', label: 'Mapa', icon: <Map className="h-4 w-4" />, standby: true, standbyLabel: '(testes)' },
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
  const { dark, toggle } = useDarkMode();
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col h-full border-r border-border bg-card transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-2.5 px-3 py-4 border-b border-border', collapsed && 'justify-center px-0')}>
          <img src={brainLogo} alt="Brain" className="h-7 w-auto shrink-0" />
          {!collapsed && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">API Studio</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

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
                    {item.standby && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                        {item.standbyLabel ?? '(stand-by)'}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Auth block */}
        {!collapsed && (
          <div className="border-t border-border p-3">
            <AuthBlock />
          </div>
        )}

        {/* Footer: collapse + dark mode */}
        <div className={cn(
          'flex items-center border-t border-border p-2',
          collapsed ? 'flex-col gap-2' : 'justify-between'
        )}>
          <button
            type="button"
            onClick={toggle}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={dark ? 'Modo claro' : 'Modo escuro'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
