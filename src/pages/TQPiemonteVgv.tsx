import { useState } from 'react';
import { ChevronDown, Mail, Lightbulb, FlaskConical, MessageSquare, CheckSquare, Square, Clock, User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Metadata do caso ────────────────────────────────────────────────────────

const CASE = {
  client: 'Wesley dos Santos',
  company: 'Piemonte',
  date: '2025-04-28',
  endpoint: '/temporal-analysis-city/sales',
  title: 'VGV em empreendimentos verticais',
  status: 'Em investigação' as const,
};

const EMAIL_BODY = `Boa tarde Pessoal, conforme conversamos coloco abaixo os detalhes sobre os endpoints que preciso de ajuda;

Análise do endpoint /temporal-analysis-city/sales

Testei o endpoint via curl com Curitiba/PR 2024. Confirmei:

- Retorna dados a nível de cidade, não por empreendimento (não há building_id nem identificador per-edifício)
- Múltiplas linhas por período+building_type (segmentação interna que não vem com label, group: null)
- liquid_sales e vgv_liquid_sales confiáveis como totais agregados (city-level ground truth)

Acredito que o erro esteja acontecendo principalmente para os empreendimentos Verticais, pois nos horizontais ainda retorna alguma coisa.

Para calculo de VGV total estou usando vendasNoPeriodo × precoPeriodo. Esse é meu único entrave atual com a API.`;

// ─── Hipóteses ────────────────────────────────────────────────────────────────

interface Hypothesis {
  id: string;
  text: string;
  detail: string;
}

const INITIAL_HYPOTHESES: Hypothesis[] = [
  {
    id: 'h1',
    text: 'O endpoint é city-level apenas — sem desagregação por empreendimento',
    detail: 'Não existe building_id na resposta. O cálculo de VGV por empreendimento individual é estruturalmente impossível com este endpoint.',
  },
  {
    id: 'h2',
    text: 'group: null + múltiplas linhas por período causa dupla-contagem no VGV',
    detail: 'Com N linhas por período+building_type sem label, aplicar vendasNoPeriodo × precoPeriodo em cada linha e somar resulta em multiplicação do total real.',
  },
  {
    id: 'h3',
    text: 'Verticais têm mais segmentos internos que horizontais, amplificando o erro',
    detail: 'Horizontais podem ter menos linhas por período, por isso "ainda retorna alguma coisa" plausível. Verticais com mais segmentação acumulam mais erro.',
  },
];

// ─── Componentes locais ───────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: typeof CASE.status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 text-xs font-medium">
      <Clock className="h-3 w-3" />
      {status}
    </span>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function TQPiemonteVgv() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState('');

  function toggleHypothesis(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">{CASE.title}</h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{CASE.endpoint}</p>
            </div>
            <StatusBadge status={CASE.status} />
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {CASE.client}
            </span>
            <span className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              {CASE.company}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {new Date(CASE.date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <hr className="border-border" />

        {/* Email original */}
        <Section title="Email original" icon={<Mail className="h-4 w-4" />} defaultOpen={false}>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
            {EMAIL_BODY}
          </pre>
        </Section>

        {/* Hipóteses */}
        <Section title="Hipóteses" icon={<Lightbulb className="h-4 w-4" />}>
          <div className="space-y-3">
            {INITIAL_HYPOTHESES.map((h) => (
              <div key={h.id} className="flex gap-3">
                <button
                  type="button"
                  onClick={() => toggleHypothesis(h.id)}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {checked[h.id]
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />}
                </button>
                <div>
                  <p className={cn('text-sm font-medium', checked[h.id] && 'line-through text-muted-foreground')}>
                    {h.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{h.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Testes / Investigação */}
        <Section title="Testes e investigação" icon={<FlaskConical className="h-4 w-4" />}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cole resultados de curl, anote observações sobre os campos retornados, registre comparações..."
            className="w-full min-h-[160px] rounded-md border border-border bg-background px-3 py-2.5 text-sm font-mono resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Section>

        {/* Rascunho de resposta */}
        <Section title="Rascunho de resposta" icon={<MessageSquare className="h-4 w-4" />}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva aqui a resposta para o cliente..."
            className="w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2.5 text-sm resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </Section>

      </div>
    </div>
  );
}
