// Corretor v3.3 (Fase A4 da ata) — painel de TESTE da extração da ata.
// Manual nesta fase (não ligado ao passo único): o analista sobe o .pptx (ou .docx),
// o painel localiza + extrai a ata e mostra IMAGEM × JSON lado a lado para validação
// no olho. Registra o custo do passe em ia_passes (tipo visao_ata).

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, FileUp } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { type ModelId } from '../lib/cost-calculator';
import { formatBRL } from '../lib/v3/config';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import { findAtaImage } from '../lib/v3/ata-image';
import { docxToText } from '../lib/v3/ata-docx';
import { extractAtaFromImage, extractAtaFromText, type AtaData, type AtaExtractResult } from '../lib/v3/ia-ata';
import { registerIaPass } from '../lib/v3/db';

const MODEL: ModelId = 'gpt-4o-mini';

interface Loaded {
  result: AtaExtractResult;
  imageUrl?: string; // objectURL da imagem da ata (só no caso .pptx)
  slide?: number;
  source: 'pptx' | 'docx';
}

export default function AtaTestPanel({ studyId }: { studyId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setBusy(true);
    setLoaded(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (/\.docx$/i.test(file.name)) {
        const doc = await docxToText(bytes);
        if (!doc) { toast.error('DOCX sem texto legível'); return; }
        const result = await extractAtaFromText(doc.texto, doc.sha1, MODEL);
        await recordPass(result);
        setLoaded({ result, source: 'docx' });
      } else if (/\.pptx$/i.test(file.name)) {
        const ir = await pptxToIr(bytes, file.name);
        const cand = await findAtaImage(bytes, ir);
        if (!cand) { toast.error('Ata não localizada nos slides 1–4'); return; }
        const result = await extractAtaFromImage(cand, MODEL);
        await recordPass(result);
        const blob = new Blob([cand.bytes as BlobPart], { type: cand.mime });
        setLoaded({ result, imageUrl: URL.createObjectURL(blob), slide: cand.slide, source: 'pptx' });
      } else {
        toast.error('Envie um .pptx ou .docx');
        return;
      }
      toast.success('Ata extraída');
    } catch (err) {
      toast.error('Falha ao extrair a ata', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function recordPass(r: AtaExtractResult) {
    if (r.fromCache || r.costUsd <= 0) return;
    try {
      await registerIaPass(studyId, 'visao_ata', `ata · ${MODEL}`, r.costUsd, r.inputTokens, r.outputTokens);
    } catch { /* best-effort: teste não deve falhar por causa do registro de custo */ }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-2">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold">Ata do projeto (β — teste de extração)</h3>
            <span className="text-[10px] text-muted-foreground">valide a leitura da LLM campo a campo</span>
            <div className="flex-1" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".pptx,.docx" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="text-xs rounded-md px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              Localizar e extrair ata (.pptx ou .docx)
            </button>
            {loaded && (
              <span className="text-[11px] text-muted-foreground">
                {loaded.source === 'pptx' ? `slide ${loaded.slide}` : 'DOCX'} ·{' '}
                {loaded.result.fromCache ? 'do cache' : formatBRL(loaded.result.costUsd)}
              </span>
            )}
          </div>

          {loaded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loaded.imageUrl ? (
                <a href={loaded.imageUrl} target="_blank" rel="noreferrer">
                  <img src={loaded.imageUrl} alt="Ata do projeto" className="w-full rounded-md border border-border bg-white" />
                </a>
              ) : (
                <div className="text-[11px] text-muted-foreground rounded-md border border-border p-3">
                  Extraído de DOCX (sem imagem).
                </div>
              )}
              <AtaJson ata={loaded.result.ata} />
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

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

function AtaJson({ ata }: { ata: AtaData | null }) {
  if (!ata) return <p className="text-xs text-muted-foreground">A LLM não reconheceu uma ata.</p>;
  const p = ata.produto;
  return (
    <div className="rounded-md border border-border p-3 space-y-0.5 overflow-x-auto">
      <Field label="Cliente" value={ata.cliente} />
      <Field label="Projeto" value={ata.projeto} />
      <Field label="Cidade / UF" value={[ata.cidade, ata.uf].filter(Boolean).join(' / ')} />
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
        </>
      )}
      <List title="Dúvidas do cliente" items={ata.duvidas_cliente} />
      <List title="Pedidos ao analista" items={ata.pedidos_analista} />
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
