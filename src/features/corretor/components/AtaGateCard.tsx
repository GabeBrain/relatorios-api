// Corretor v5 / WS-1 — PORTÃO da ata. Confirmação humana da cidade/UF (o parâmetro
// que contamina CITY_NAME/WRONG_CONTEXT/cobertura) ANTES dos passes pagos. Um clique
// aqui vale mais que qualquer heurística depois. Sem ata, vira formulário obrigatório
// de cidade/UF — resolve o buraco do `cidade: null` no upload.

import { useState } from 'react';
import { MapPin, FileText, Loader2, Sparkles, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AtaData } from '../lib/v3/ia-ata';
import type { CitySuggestion } from '../lib/v3/city-suggestion';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export interface AtaGateValue {
  cidade: string;
  uf: string;
  /** ata com os pedidos possivelmente editados (null se não havia ata) */
  ata: AtaData | null;
}

export default function AtaGateCard({ ata, costBrl, running, onConfirm, suggestion, temFonte, onAttachSources, sourceLabel }: {
  ata: AtaData | null;
  /** custo estimado da fase 2 (texto + visão), já em R$ */
  costBrl: string;
  running: boolean;
  onConfirm: (value: AtaGateValue) => void;
  /** Cidade/UF inferidas do nome do arquivo ou da capa, quando a ata não traz. */
  suggestion?: CitySuggestion | null;
  /** Planilhas-fonte vinculadas; sem elas o cruzamento com a fonte fica desligado. */
  temFonte?: boolean;
  onAttachSources?: () => void;
  sourceLabel?: string | null;
}) {
  const [cidade, setCidade] = useState(ata?.cidade ?? suggestion?.cidade ?? '');
  const [uf, setUf] = useState((ata?.uf ?? suggestion?.uf ?? '').toUpperCase());
  const suggested = !ata?.cidade && Boolean(suggestion);
  const [pedidos, setPedidos] = useState((ata?.pedidos_analista ?? []).join('\n'));

  const cidadeOk = cidade.trim().length >= 2;
  const ufOk = UFS.includes(uf.trim().toUpperCase());
  const canConfirm = cidadeOk && ufOk && !running;
  const p = ata?.produto;

  function confirm() {
    if (!canConfirm) return;
    const editedPedidos = pedidos.split('\n').map((l) => l.trim()).filter(Boolean);
    const nextAta: AtaData | null = ata ? { ...ata, cidade: cidade.trim(), uf: uf.trim().toUpperCase(), pedidos_analista: editedPedidos } : null;
    onConfirm({ cidade: cidade.trim(), uf: uf.trim().toUpperCase(), ata: nextAta });
  }

  return (
    <div className="rounded-lg border-2 border-amber-500/60 bg-amber-500/5 px-4 py-4 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-sm font-semibold">Falta um passo: confirme a cidade para rodar a análise completa</h3>
        </div>
        <p className="text-[11px] text-muted-foreground pl-7">
          Até aqui só a triagem inicial rodou. O texto, as imagens de tabela e os cruzamentos ainda não foram
          conferidos, então os contadores acima ainda não dizem nada sobre o estudo.
          {ata ? ' A cidade/UF da ata é a régua da revisão.' : ' A ata não trouxe a cidade.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Cidade do estudo</span>
          <input
            value={cidade} onChange={(e) => setCidade(e.target.value)}
            placeholder="ex.: Guarulhos"
            className={cn('text-sm rounded-md border bg-background px-2.5 py-1.5 w-56', cidadeOk ? 'border-border' : 'border-amber-500/60')}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground">UF</span>
          <select
            value={uf} onChange={(e) => setUf(e.target.value)}
            className={cn('text-sm rounded-md border bg-background px-2 py-1.5', ufOk ? 'border-border' : 'border-amber-500/60')}
          >
            <option value="">—</option>
            {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
      {/* Fora da linha dos campos: dentro do label da cidade ele desalinhava a UF. */}
      {suggested && (
        <p className="-mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
          Cidade e UF sugeridas pelo {suggestion!.origem === 'arquivo' ? 'nome do arquivo' : 'texto da capa'} — confira antes de analisar.
        </p>
      )}

      {/* Ata multi-estudo (uma ata abre vários estudos): a LLM não escolhe por nós —
          o analista clica na cidade correta deste estudo. */}
      {(ata?.cidades_candidatas?.length ?? 0) > 1 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            Esta ata abre <strong>vários estudos</strong>. Qual é a cidade deste estudo?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ata!.cidades_candidatas.map((c) => {
              const [nome, sigla] = c.split(/\s*[/\-–—]\s*|\s+(?=[A-Z]{2}$)/);
              const active = cidade.trim().toLowerCase() === (nome ?? '').trim().toLowerCase();
              return (
                <button
                  key={c} type="button"
                  onClick={() => { setCidade((nome ?? '').trim()); setUf((sigla ?? '').trim().toUpperCase()); }}
                  className={cn('text-xs rounded-full border px-2.5 py-1 transition-colors',
                    active ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700 font-medium' : 'border-border hover:bg-muted')}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ata?.localizacao_fonte && (
        <p className="text-[11px] text-muted-foreground italic">A ata diz: “{ata.localizacao_fonte}”</p>
      )}

      {(ata?.comentarios_sobrepostos?.length ?? 0) > 0 && (
        <div className="text-[11px] text-muted-foreground">
          <span className="font-medium">Comentário sobre a ata:</span>
          <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
            {ata!.comentarios_sobrepostos.map((c, i) => <li key={i} className="italic">“{c}”</li>)}
          </ul>
        </div>
      )}

      {p && (p.torres || p.unidades || p.dorms?.length) && (
        <p className="text-[11px] text-muted-foreground">
          Produto na ata: {[p.torres && `${p.torres} torre(s)`, p.unidades && `${p.unidades} unid.`, p.dorms?.length && `${p.dorms.join('/')} dorms`, (p.m2_min || p.m2_max) && `${[p.m2_min, p.m2_max].filter(Boolean).join('–')}m²`].filter(Boolean).join(' · ')}
        </p>
      )}

      {ata && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground">Pedidos da ata (um por linha — verificamos se o estudo cobriu cada um)</span>
          <textarea
            value={pedidos} onChange={(e) => setPedidos(e.target.value)}
            rows={Math.min(6, Math.max(2, pedidos.split('\n').length))}
            className="text-xs rounded-md border border-border bg-background px-2.5 py-1.5 font-mono"
          />
        </label>
      )}

      {temFonte === false && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-background px-3 py-2 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="flex-1 min-w-[200px]">
            Nenhuma planilha vinculada: o cruzamento com a fonte (verticalização, população, oferta) fica desligado.
          </span>
          {onAttachSources && (
            <button type="button" onClick={onAttachSources} className="rounded-md border border-border px-2 py-1 hover:border-primary/50 inline-flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Vincular planilhas
            </button>
          )}
        </div>
      )}
      {temFonte && sourceLabel && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Planilhas vinculadas: {sourceLabel}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={confirm} disabled={!canConfirm}
          className="text-sm rounded-md px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2 disabled:opacity-40"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Confirmar e analisar ({costBrl})
        </button>
        {!cidadeOk && <span className="text-[11px] text-amber-600">informe a cidade</span>}
        {cidadeOk && !ufOk && <span className="text-[11px] text-amber-600">selecione a UF</span>}
      </div>
    </div>
  );
}
