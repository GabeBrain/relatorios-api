import { useNavigate } from 'react-router-dom';
import {
  Home,
  BarChart2,
  ClipboardList,
  Building2,
  Database,
  Plug,
  FolderSearch,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useArchiveStore } from '@/features/corretor/store/archive-store';

interface Destination {
  label: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string;
}

const PAGES: Destination[] = [
  { label: 'Início', path: '/inicio', icon: <Home className="h-4 w-4" /> },
  { label: 'Relatório Secovi', path: '/relatorios/secovi', icon: <BarChart2 className="h-4 w-4" />, keywords: 'barretos excel mercado' },
  { label: 'Dashboard Geobrain', path: '/relatorios/dashboard-geobrain', icon: <BarChart2 className="h-4 w-4" /> },
  { label: 'Auditoria de Estudos — Projetos', path: '/auditoria', icon: <ClipboardList className="h-4 w-4" />, keywords: 'corretor vocacional slides' },
  { label: 'Qualidade — Piemonte VGV Verticais', path: '/qualidade/piemonte/vgv', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Qualidade — Piemonte Release Price', path: '/qualidade/piemonte/release-price', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Qualidade — CID Validação de Base', path: '/qualidade/cid/validacao-base', icon: <Database className="h-4 w-4" /> },
  { label: 'API Explorer', path: '/apis/explorer', icon: <Plug className="h-4 w-4" />, keywords: 'documentacao testes requisicao endpoint console' },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { projects } = useArchiveStore();

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Ir para… (páginas e projetos)" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {PAGES.map((p) => (
            <CommandItem key={p.path + p.label} value={`${p.label} ${p.keywords ?? ''}`} onSelect={() => go(p.path)}>
              <span className="mr-2 text-muted-foreground">{p.icon}</span>
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {projects.length > 0 && (
          <CommandGroup heading="Auditorias (Corretor)">
            {projects.slice(0, 8).map((proj) => (
              <CommandItem
                key={proj.id}
                value={`auditoria ${proj.projectName} ${proj.cityName}`}
                onSelect={() => go('/auditoria')}
              >
                <span className="mr-2 text-muted-foreground"><FolderSearch className="h-4 w-4" /></span>
                <span className="truncate">{proj.projectName}</span>
                <span className="ml-2 text-xs text-muted-foreground shrink-0">{proj.cityName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
