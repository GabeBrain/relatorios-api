// Corretor v3.3 (Fase B da ata) — card da ata extraída no passo único, no workspace.
// Mostra o que a LLM leu (a régua do estudo). Read-only nesta fatia; edição fica p/
// a fatia seguinte (o analista corrige a leitura). Se não houver ata, cai para o
// painel de teste manual (AtaTestPanel).

import { useState } from 'react';
import { FileText, ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { AtaData } from '../lib/v3/ia-ata';

function Field({ label, value }: { label: string; value: unknown }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex gap-2 text-xs py-0.5">
      <span className="text-muted-foreground shrink-0 w-32">{label}</span>
      <span className={empty ? 'text-muted-foreground/50 italic' : 'text-foreground font-medium'}>
        {empty ? '—' : String(value)}
      </span>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="pt-1.5">
      <div className="text-[10px] font-semibold text-muted-foreground">{title} ({items?.length ?? 0})</div>
      {items?.length ? (
        <ul className="list-disc list-inside text-xs text-foreground space-y-0.5 mt-0.5">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground/50 italic">—</p>
      )}
    </div>
  );
}

export default function AtaCard({ ata }: { ata: AtaData }) {
  const [open, setOpen] = useState(false);
  const p = ata.produto;
  const local = [ata.cidade, ata.uf].filter(Boolean).join(' / ');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-sm font-semibold">Ata do projeto</h3>
            {local && (
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {local}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              · {ata.pedidos_analista?.length ?? 0} pedido(s) · {ata.duvidas_cliente?.length ?? 0} dúvida(s)
            </span>
            <div className="flex-1" />
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <Field label="Cliente" value={ata.cliente} />
            <Field label="Projeto" value={ata.projeto} />
            <Field label="Cidade / UF" value={local} />
            <Field label="Fonte cidade/UF" value={ata.localizacao_fonte} />
            <Field label="Bairro" value={ata.bairro} />
            <Field label="Endereço" value={ata.endereco} />
            <Field label="Área terreno (m²)" value={ata.area_terreno_m2} />
            <Field label="Preço-guia (R$/m²)" value={ata.preco_m2_viabilidade} />
            {p && (
              <>
                <div className="text-[10px] font-semibold text-muted-foreground pt-1.5">Produto</div>
                <Field label="Torres" value={p.torres} />
                <Field label="Unidades" value={p.unidades} />
                <Field label="Dorms" value={p.dorms?.join(', ')} />
                <Field label="m² (min–máx)" value={[p.m2_min, p.m2_max].filter((x) => x != null).join('–')} />
                <Field label="Vagas (%)" value={p.vagas_pct} />
                <Field label="Programa" value={p.programa} />
                <List title="Detalhes do produto" items={p.observacoes ?? []} />
              </>
            )}
          </div>
          <div>
            <List title="Pedidos ao analista" items={ata.pedidos_analista} />
            <List title="Dúvidas do cliente" items={ata.duvidas_cliente} />
            <List title="Observações de localização" items={ata.observacoes_localizacao ?? []} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
