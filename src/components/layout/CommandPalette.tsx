import { useNavigate } from 'react-router-dom';
import {
  Home,
  BarChart2,
  ClipboardList,
  Building2,
  Database,
  FolderSearch,
  TrendingUp,
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
  { label: 'Rebrain — Secovi', path: '/rebrain/secovi', icon: <Building2 className="h-4 w-4" />, keywords: 'barretos excel mercado relatorio' },
  { label: 'Rebrain — Relatório AELO', path: '/rebrain/aelo', icon: <Building2 className="h-4 w-4" />, keywords: 'aelo excel mercado relatorio' },
  { label: 'Rebrain — Relatório Secovi/FIERGS', path: '/rebrain/panorama-secovi-fiergs', icon: <BarChart2 className="h-4 w-4" />, keywords: 'panorama fiergs piracicaba lancamentos pdf comparacao' },
  { label: 'Rebrain — Corretor | Vocacionais', path: '/auditoria', icon: <ClipboardList className="h-4 w-4" />, keywords: 'corretor vocacional slides auditoria' },
  { label: 'Rebrain — Empresas e Empregados', path: '/rebrain/empresas-empregados', icon: <Building2 className="h-4 w-4" />, keywords: 'rais empregados emprego formal empresas cnpj municipio cbo' },
  { label: 'Rebrain — Atualizador VGV', path: '/atualizador-vgv', icon: <TrendingUp className="h-4 w-4" />, keywords: 'vgv empreendimento excel incc ipca igp-di mapa' },
  { label: 'Dashboard Geobrain', path: '/dash-geobrain', icon: <BarChart2 className="h-4 w-4" />, keywords: 'dash geobrain dashboard' },
  { label: 'Banco Quanti', path: '/quanti', icon: <Database className="h-4 w-4" />, keywords: 'area quanti quantitativo base dashboard' },
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
