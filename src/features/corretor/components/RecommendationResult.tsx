import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recommendationBlocks, recommendationBlockText } from '../lib/recommendation-presentation';

export default function RecommendationResult({text}: {text: string}) {
  const blocks = useMemo(() => recommendationBlocks(text), [text]);
  const [copied, setCopied] = useState<number | null>(null), [error, setError] = useState('');
  async function copy(index: number) {
    setError('');
    try { await navigator.clipboard.writeText(recommendationBlockText(blocks[index])); setCopied(index); }
    catch { setError('Não foi possível copiar. Selecione o texto do bloco ou use Baixar texto.'); }
  }
  return <div className="cr-result cr-text" aria-label="Blocos da sugestão de análise">
    {error && <p role="alert">{error}</p>}
    {blocks.map((block,index) => <section className="cr-result-block" key={`${index}:${block.title}`} aria-label={block.title}>
      <header className="cr-result-heading"><div>{block.context && <p className="cr-result-context">{block.context}</p>}<h3>{block.title}</h3></div>
        <Button variant="outline" aria-label={`Copiar bloco: ${block.title}`} onClick={() => void copy(index)}>{copied===index?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}{copied===index?'Copiado':'Copiar bloco'}</Button>
      </header>
      {block.text && <div className="cr-result-body">{block.text.split(/\n\s*\n/).map((paragraph,n)=><p key={n}>{paragraph}</p>)}</div>}
    </section>)}
    <span className="sr-only" role="status" aria-live="polite">{copied!==null?`Bloco ${blocks[copied]?.title} copiado em texto simples.`:''}</span>
  </div>;
}
