import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  ClipboardCheck,
  Database,
  FileBarChart,
  FileSearch,
  Plug,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Audience = 'Analistas' | 'Pesquisa' | 'Gestão' | 'Operação' | 'Técnico';

interface Tool {
  title: string;
  description: string;
  to: string;
  audiences: Audience[];
  study: string;
}

interface Journey {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tools: Tool[];
}

const AUDIENCES: Audience[] = ['Analistas', 'Pesquisa', 'Gestão', 'Operação', 'Técnico'];

const JOURNEYS: Journey[] = [
  {
    title: 'Gerar um relatório de mercado',
    description: 'Transforme dados imobiliários em entregáveis técnicos, planilhas e apresentações executivas.',
    icon: FileBarChart,
    tools: [
      { title: 'Relatório Secovi', description: 'Consolide o mercado de uma cidade e exporte os dados para Excel.', to: '/rebrain/secovi', audiences: ['Analistas', 'Gestão'], study: 'Relatório municipal' },
      { title: 'Panorama Secovi/FIERGS', description: 'Monte um panorama editorial paginado por praça e período.', to: '/rebrain/panorama-secovi-fiergs', audiences: ['Analistas', 'Gestão'], study: 'Panorama executivo' },
      { title: 'Relatório AELO', description: 'Analise loteamentos abertos e fechados nas regiões atendidas.', to: '/rebrain/aelo', audiences: ['Analistas', 'Gestão'], study: 'Loteamentos' },
    ],
  },
  {
    title: 'Analisar mercado e pesquisa',
    description: 'Explore oferta, desempenho, território e comportamento de público para apoiar decisões.',
    icon: BarChart3,
    tools: [
      { title: 'Dashboard GeoBrain', description: 'Investigue empreendimentos, filtros urbanos e indicadores de mercado.', to: '/dash-geobrain', audiences: ['Analistas', 'Gestão'], study: 'Mercado imobiliário' },
      { title: 'Banco Quanti', description: 'Explore a Base Unificada, perfis e intenção de compra.', to: '/quanti', audiences: ['Pesquisa', 'Analistas', 'Gestão'], study: 'Pesquisa quantitativa' },
    ],
  },
  {
    title: 'Validar ou atualizar dados',
    description: 'Revise estudos, confira consistência de fechamento e mantenha bases de empreendimentos atualizadas.',
    icon: ClipboardCheck,
    tools: [
      { title: 'Corretor de Estudos', description: 'Revise estudos vocacionais e organize os achados da auditoria.', to: '/corretor', audiences: ['Pesquisa', 'Analistas'], study: 'Estudo vocacional' },
      { title: 'Validação do Fechamento', description: 'Confira vendas, estoque e consistência por cidade e período.', to: '/rebrain/validacao-fechamento', audiences: ['Operação', 'Analistas'], study: 'Qualidade de dados' },
      { title: 'Atualizador VGV', description: 'Carregue uma planilha para atualizar e analisar empreendimentos.', to: '/atualizador-vgv', audiences: ['Operação', 'Analistas'], study: 'Base de VGV' },
    ],
  },
];

const SUPPORT_TOOLS: Tool[] = [
  { title: 'API Explorer', description: 'Consulte contratos e teste APIs GeoBrain e Sócio.', to: '/apis/explorer', audiences: ['Técnico'], study: 'Integrações' },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      to={tool.to}
      className="group flex min-h-40 flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">{tool.study}</Badge>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground">{tool.title}</h3>
      <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{tool.description}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        {tool.audiences.map((item) => <span key={item} className="text-xs text-muted-foreground">{item}</span>)}
      </div>
    </Link>
  );
}

export default function Home() {
  const [audience, setAudience] = useState<Audience | null>(null);
  const journeys = JOURNEYS.map((journey) => ({
    ...journey,
    tools: audience ? journey.tools.filter((tool) => tool.audiences.includes(audience)) : journey.tools,
  })).filter((journey) => journey.tools.length > 0);
  const supportTools = audience ? SUPPORT_TOOLS.filter((tool) => tool.audiences.includes(audience)) : SUPPORT_TOOLS;

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-5 sm:p-8 lg:p-10 animate-fade-in">
      <header className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            Rebrain · Inteligência estratégica
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">O que você precisa fazer hoje?</h1>
          <p className="mt-3 text-base leading-6 text-muted-foreground sm:text-lg">
            Escolha pelo objetivo do seu trabalho. Nós levamos você à ferramenta certa para analisar, validar ou apresentar dados.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link to="/apis/explorer"><Plug className="h-4 w-4" /> Conhecer as APIs</Link>
        </Button>
      </header>

      <section aria-labelledby="audience-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="audience-heading" className="text-base font-semibold">Qual é o seu contexto?</h2>
            <p className="text-sm text-muted-foreground">Use este filtro para destacar os ambientes mais comuns para seu perfil.</p>
          </div>
          {audience && (
            <Button variant="ghost" size="sm" onClick={() => setAudience(null)}>
              <RefreshCw className="h-3.5 w-3.5" /> Ver todos
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por público">
          {AUDIENCES.map((item) => (
            <Button key={item} variant={audience === item ? 'default' : 'outline'} size="sm" onClick={() => setAudience(audience === item ? null : item)}>
              <Users className="h-3.5 w-3.5" /> {item}
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="journeys-heading" className="space-y-5">
        <div>
          <h2 id="journeys-heading" className="text-xl font-semibold">Comece pelo objetivo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada caminho reúne os tipos de estudo e fluxos que fazem sentido juntos.</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {journeys.map((journey) => {
            const Icon = journey.icon;
            return (
              <section key={journey.title} className="rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
                <div className="mb-5 flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{journey.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{journey.description}</p>
                  </div>
                </div>
                <div className={cn('grid gap-3', journey.tools.length > 1 && 'sm:grid-cols-2 xl:grid-cols-1')}>
                  {journey.tools.map((tool) => <ToolCard key={tool.to} tool={tool} />)}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {supportTools.length > 0 && (
        <section aria-labelledby="support-heading" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="support-heading" className="font-semibold">Também disponível</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ferramentas de apoio para trabalho técnico e integrações.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {supportTools.map((tool) => (
                <Button key={tool.to} asChild variant="outline"><Link to={tool.to}><Database className="h-4 w-4" /> {tool.title}</Link></Button>
              ))}
            </div>
          </div>
        </section>
      )}

      {journeys.length === 0 && (
        <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <FileSearch className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">Nenhum ambiente destacado para este perfil</h2>
          <p className="mt-1 text-sm text-muted-foreground">Você ainda pode ver todos os ambientes ou usar a busca global pelo atalho Ctrl + K.</p>
          <Button className="mt-4" variant="outline" onClick={() => setAudience(null)}>Ver todos os ambientes</Button>
        </section>
      )}
    </div>
  );
}
