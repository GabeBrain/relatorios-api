// Corretor v3 — PRÉ-ANÁLISE (substitui o portão da ata). Antes de gastar, o
// analista confirma três coisas e vê uma: cidade, outras cidades do estudo,
// planilhas (decisão obrigatória) e quantas tabelas vão pela leitura de imagem.
// Pouco texto de propósito: o portão anterior tinha um parágrafo que ninguém lia
// e a análise do estudo de João Pessoa nunca rodou (30/set).

import { useState } from 'react';
import { Loader2, PlayCircle, FileSpreadsheet, Image as ImageIcon, Table2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AtaData } from '../lib/v3/ia-ata';
import type { CitySuggestion } from '../lib/v3/city-suggestion';
import type { CityMention, ImageProfile } from '../lib/v3/pre-analysis';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export type SourcesChoice = 'agora' | 'nao-tem' | 'depois';

export interface PreAnalysisValue {
  cidade: string;
  uf: string;
  /** Outras cidades confirmadas como parte do estudo (não viram “contexto errado”). */
  outras: string[];
  ata: AtaData | null;
  planilhas: SourcesChoice;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Stat({ icon, n, label, tone }: { icon: React.ReactNode; n: number; label: string; tone?: 'warn' | 'muted' }) {
  return (
    <div className={cn('rounded-md border px-2.5 py-1.5', tone === 'warn' ? 'border-amber-500/50 bg-amber-500/5' : 'border-border')}>
      <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">{icon}{n}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

export default function PreAnalysisCard({
  ata, suggestion, cities, profile, costBrl, running, temFonte, sourceLabel, onAttachSources, onConfirm, cache,
}: {
  ata: AtaData | null;
  suggestion: CitySuggestion | null;
  cities: CityMention[];
  profile: ImageProfile;
  costBrl: string;
  running: boolean;
  temFonte: boolean;
  sourceLabel: string | null;
  onAttachSources: () => void;
  onConfirm: (value: PreAnalysisValue) => void;
  /** Imagens de tabela já lidas em análises anteriores (cache): não são cobradas de novo. */
  cache?: { cached: number; total: number };
}) {
  const [cidade, setCidade] = useState(ata?.cidade ?? suggestion?.cidade ?? '');
  const [uf, setUf] = useState((ata?.uf ?? suggestion?.uf ?? '').toUpperCase());
  const [outras, setOutras] = useState<string[]>([]);
  const [extra, setExtra] = useState('');
  const [planilhas, setPlanilhas] = useState<SourcesChoice | null>(temFonte ? 'agora' : null);
  const [pedidos, setPedidos] = useState((ata?.pedidos_analista ?? []).join('\n'));
  const choice: SourcesChoice | null = temFonte ? 'agora' : planilhas === 'agora' ? null : planilhas;

  const cidadeOk = cidade.trim().length >= 2;
  const ufOk = UFS.includes(uf.trim().toUpperCase());
  const ready = cidadeOk && ufOk && choice !== null && !running;
  const suggested = !ata?.cidade && suggestion && cidade === suggestion.cidade;

  const toggle = (c: string) => setOutras((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  function addExtra() {
    const c = extra.trim();
    if (c.length >= 2 && !outras.includes(c)) setOutras((prev) => [...prev, c]);
    setExtra('');
  }
  function confirm() {
    if (!ready) return;
    const editedPedidos = pedidos.split('\n').map((l) => l.trim()).filter(Boolean);
    const nextAta = ata ? { ...ata, cidade: cidade.trim(), uf: uf.trim().toUpperCase(), pedidos_analista: editedPedidos } : null;
    onConfirm({ cidade: cidade.trim(), uf: uf.trim().toUpperCase(), outras, ata: nextAta, planilhas: choice! });
  }

  return (
    <div className="rounded-xl border-2 border-primary/40 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Pré-análise — confirme e rode</h3>
        <span className="text-[11px] text-muted-foreground">nada foi cobrado ainda</span>
      </div>

      <div className="grid gap-5 px-4 py-4 md:grid-cols-2">
        <div className="space-y-5">
          <Section title="Cidade do estudo">
            <div className="flex items-center gap-2">
              <input
                value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="ex.: Guarulhos"
                className={cn('h-9 flex-1 rounded-md border bg-background px-2.5 text-sm', cidadeOk ? 'border-border' : 'border-amber-500/60')}
              />
              <select
                value={uf} onChange={(e) => setUf(e.target.value)}
                className={cn('h-9 rounded-md border bg-background px-2 text-sm', ufOk ? 'border-border' : 'border-amber-500/60')}
              >
                <option value="">UF</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {suggested && <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Sugerida pelo {suggestion!.origem === 'arquivo' ? 'nome do arquivo' : 'texto da capa'}.</p>}
            {(ata?.cidades_candidatas?.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {ata!.cidades_candidatas.map((c) => {
                  const [nome, sigla] = c.split(/\s*[/\-–—]\s*|\s+(?=[A-Z]{2}$)/);
                  return (
                    <button key={c} type="button" onClick={() => { setCidade((nome ?? '').trim()); setUf((sigla ?? '').trim().toUpperCase()); }}
                      className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">{c}</button>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Outras cidades no estudo">
            <div className="flex flex-wrap gap-1.5">
              {cities.map((m) => {
                const label = `${m.cidade}/${m.uf}`;
                const on = outras.includes(m.cidade);
                return (
                  <button key={label} type="button" onClick={() => toggle(m.cidade)}
                    title={`citada ${m.vezes}× (slides ${m.slides.slice(0, 6).join(', ')})`}
                    className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                      on ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-medium' : 'border-border hover:bg-muted')}>
                    {on ? '✓ ' : ''}{label} <span className="text-muted-foreground">{m.vezes}×</span>
                  </button>
                );
              })}
              {outras.filter((c) => !cities.some((m) => m.cidade === c)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full border border-emerald-600 bg-emerald-600/10 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                  {c}<button type="button" onClick={() => toggle(c)} aria-label={`remover ${c}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <span className="inline-flex items-center gap-1">
                <input value={extra} onChange={(e) => setExtra(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExtra()}
                  placeholder="adicionar" className="h-6 w-24 rounded-full border border-dashed bg-background px-2 text-xs" />
                <button type="button" onClick={addExtra} className="text-muted-foreground hover:text-foreground" aria-label="adicionar cidade"><Plus className="h-3.5 w-3.5" /></button>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {cities.length ? 'Marque as que fazem parte do estudo: elas não serão acusadas como dado de outro lugar.' : 'Nenhuma outra cidade citada com UF. Adicione se o estudo cobrir mais de uma.'}
            </p>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Planilhas de processamento">
            {temFonte ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><FileSpreadsheet className="h-4 w-4" /> {sourceLabel ?? 'Planilhas vinculadas'}</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {([['agora', 'Vincular agora'], ['nao-tem', 'Não tem'], ['depois', 'Vincular depois']] as const).map(([key, label]) => (
                  <button key={key} type="button"
                    onClick={() => { setPlanilhas(key); if (key === 'agora') onAttachSources(); }}
                    className={cn('rounded-md border px-2 py-1.5 text-xs', planilhas === key && key !== 'agora' ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-muted')}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {!temFonte && choice === 'depois' && <p className="text-[11px] text-muted-foreground">O cruzamento com as planilhas roda quando você vinculá-las, sem nova leitura nem custo.</p>}
          </Section>

          <Section title="O que será lido">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <Stat icon={<Table2 className="h-3.5 w-3.5 text-emerald-600" />} n={profile.tabelasNativas} label="tabelas nativas" />
              <Stat icon={<ImageIcon className="h-3.5 w-3.5 text-amber-600" />} n={profile.tabelasImagem + profile.fichas} label="tabelas em imagem" tone={profile.tabelasImagem + profile.fichas > 0 ? 'warn' : undefined} />
              <Stat icon={<ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />} n={profile.outras} label="mapas e fotos" />
              <Stat icon={<X className="h-3.5 w-3.5 text-muted-foreground" />} n={profile.naoLidas} label="não legíveis" />
            </div>
            {profile.tabelasImagem + profile.fichas > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Tabelas coladas como imagem são lidas por IA e podem gerar alertas falsos. Confira cada alerta de soma na imagem.
              </p>
            )}
          </Section>

          {ata && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Pedidos da ata ({pedidos.split('\n').filter((l) => l.trim()).length})</summary>
              <textarea value={pedidos} onChange={(e) => setPedidos(e.target.value)} rows={4}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs" />
            </details>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-3">
        <button onClick={confirm} disabled={!ready}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Rodar análise ({costBrl})
        </button>
        <span className="text-[11px] text-muted-foreground">
          {!cidadeOk || !ufOk ? 'Falta confirmar a cidade e a UF.' : choice === null ? 'Falta dizer se o estudo tem planilhas.' : 'Tudo pronto.'}
        </span>
        {cache && cache.total > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground" title="Leituras de imagem ficam guardadas; só as novas são cobradas">
            {cache.cached === cache.total
              ? `As ${cache.total} imagens já foram lidas antes: custo só do texto.`
              : cache.cached > 0
                ? `${cache.cached} de ${cache.total} imagens já lidas antes (sem custo).`
                : 'Estimativa inclui releituras no gpt-4o.'}
          </span>
        )}
      </div>
    </div>
  );
}
