import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAnalysisStore, type ModelId } from '../store/analysis-store';
import { MODEL_PRICING, estimateProjectCost, formatUSD } from '../lib/cost-calculator';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function NewProjectForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { setFile, setConfig, setApiKey, reset, apiKey: storedKey } = useAnalysisStore();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [cityName, setCityName] = useState('');
  const [radii, setRadii] = useState('5min, 10min, 15min');
  const [model, setModel] = useState<ModelId>('gpt-4o');
  const [apiKeyInput, setApiKeyInput] = useState(storedKey);
  const [showKey, setShowKey] = useState(false);

  const inputId = useRef(`pdf-input-${Math.random().toString(36).slice(2)}`).current;

  const loadPdf = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pdf')) return;
    setLoadingPdf(true);
    setPdfFile(file);
    setPageCount(null);
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPageCount(doc.numPages);
      doc.destroy();
    } finally {
      setLoadingPdf(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadPdf(file);
    },
    [loadPdf]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdf(file);
    },
    [loadPdf]
  );

  const estimate = pageCount ? estimateProjectCost(pageCount, model) : null;

  const canSubmit =
    pdfFile &&
    pageCount &&
    projectName.trim() &&
    cityName.trim() &&
    radii.trim() &&
    apiKeyInput.trim().startsWith('sk-') &&
    !loadingPdf;

  function handleStart() {
    if (!canSubmit || !pdfFile) return;
    reset();
    setFile(pdfFile);
    setApiKey(apiKeyInput.trim());
    setConfig({
      projectName: projectName.trim(),
      cityName: cityName.trim(),
      radii: radii.trim(),
      model,
    });
    navigate('/relatorios/corretor/analise');
  }

  const padding = compact ? 'p-3' : 'p-4';
  const gap = compact ? 'space-y-3' : 'space-y-4';

  return (
    <div className={`${gap}`}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById(inputId)?.click()}
        className={`
          border-2 border-dashed rounded-lg ${padding} text-center cursor-pointer transition-colors
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
          }
        `}
      >
        <input id={inputId} type="file" accept=".pdf" className="hidden" onChange={onFileInput} />
        {loadingPdf ? (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-xs">Lendo PDF…</p>
          </div>
        ) : pdfFile && pageCount ? (
          <div className="flex flex-col items-center gap-1.5">
            <FileText className="w-5 h-5 text-primary" />
            <p className="font-medium text-xs truncate max-w-full px-2">{pdfFile.name}</p>
            <Badge variant="secondary" className="text-[10px] h-4">
              {pageCount} slides
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Upload className="w-5 h-5" />
            <p className="text-xs font-medium">Arraste o PDF ou clique</p>
            <p className="text-[10px]">Exporte o PPTX como PDF</p>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label htmlFor="np-name" className="text-xs">
            Nome do Projeto
          </Label>
          <Input
            id="np-name"
            placeholder="Ex: Estudo Brumadinho v1"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="np-city" className="text-xs">
            Cidade
          </Label>
          <Input
            id="np-city"
            placeholder="Ex: Brumadinho"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="np-radii" className="text-xs">
            Raios de Estudo
          </Label>
          <Input
            id="np-radii"
            placeholder="Ex: 5min, 10min, 15min"
            value={radii}
            onChange={(e) => setRadii(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Modelo de IA</Label>
          <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(MODEL_PRICING) as [ModelId, (typeof MODEL_PRICING)[ModelId]][]).map(
                ([id, info]) => (
                  <SelectItem key={id} value={id} className="text-xs">
                    {info.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="np-key" className="text-xs">
            Chave OpenAI
          </Label>
          <div className="relative">
            <Input
              id="np-key"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="pr-8 h-8 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Estimate */}
      {estimate && pageCount && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground space-y-0.5">
          <div className="flex justify-between">
            <span>Estimativa total</span>
            <span className="font-mono font-semibold text-foreground">
              {formatUSD(estimate.total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Por slide</span>
            <span className="font-mono">{formatUSD(estimate.perSlide)}</span>
          </div>
        </div>
      )}

      <Button className="w-full" disabled={!canSubmit} onClick={handleStart}>
        Iniciar Análise
      </Button>
    </div>
  );
}
