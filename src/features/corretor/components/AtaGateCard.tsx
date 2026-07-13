// Corretor v5 / WS-1 — PORTÃO da ata. Confirmação humana da cidade/UF (o parâmetro
// que contamina CITY_NAME/WRONG_CONTEXT/cobertura) ANTES dos passes pagos. Um clique
// aqui vale mais que qualquer heurística depois. Sem ata, vira formulário obrigatório
// de cidade/UF — resolve o buraco do `cidade: null` no upload.

import { useState } from 'react';
import { MapPin, FileText, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AtaData } from '../lib/v3/ia-ata';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export interface AtaGateValue {
  cidade: string;
  uf: string;
  /** ata com os pedidos possivelmente editados (null se não havia ata) */
  ata: AtaData | null;
}

export default function AtaGateCard({ ata, costBrl, running, onConfirm }: {
  ata: AtaData | null;
  /** custo estimado da fase 2 (texto + visão), já em R$ */
  costBrl: string;
  running: boolean;
  onConfirm: (value: AtaGateValue) => void;
}) {
  const [cidade, setCidade] = useState(ata?.cidade ?? '');
  const [uf, setUf] = useState((ata?.uf ?? '').toUpperCase());
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
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-amber-600 shrink-0" />
        <h3 className="text-sm font-semibold">
          {ata ? 'Confirme a ata antes de analisar' : 'Informe a cidade do estudo'}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {ata ? 'a cidade/UF é a régua da revisão' : 'sem ata detectada — o corretor precisa saber onde é o estudo'}
        </span>
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

      {ata?.localizacao_fonte && (
        <p className="text-[11px] text-muted-foreground italic">A ata diz: “{ata.localizacao_fonte}”</p>
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
