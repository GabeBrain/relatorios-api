import { useCallback, useRef, useState } from 'react';
import { Upload, FileUp, Loader2, Building2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeoWorker } from '@/legacy/mapa/hooks/use-geo-worker';
import { useMunicipalLayer } from '@/legacy/mapa/hooks/use-municipal-layer';
import { useSectorLayer } from '@/legacy/mapa/hooks/use-sector-layer';
import { toast } from 'sonner';

const ACCEPT = '.kml,.kmz,.geojson,.json';

export default function FileDropZone() {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { parseFile } = useGeoWorker();
  const { loadMunicipalLayer, loadingMunicipal } = useMunicipalLayer();
  const {
    loadSectorLayerFromSelection,
    loadingSetor,
    selectedMunicipalityLabel,
  } = useSectorLayer();
  const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : String(err);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        try {
          await parseFile(file);
          toast.success(`Loaded ${file.name}`);
        } catch (err: unknown) {
          toast.error(`Failed to load ${file.name}: ${getErrorMessage(err)}`);
        }
      }
    },
    [parseFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
        dragging
          ? 'border-primary bg-muted/60'
          : 'border-border bg-card hover:border-primary/40'
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <div className="rounded-full bg-muted p-3">
        {dragging ? (
          <FileUp className="h-6 w-6 text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <p className="font-heading text-sm font-semibold text-foreground">
          Drop files here
        </p>
        <p className="mt-1 text-xs text-muted-foreground">KML, KMZ, or GeoJSON</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-1"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        Browse Files
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={loadingMunicipal}
        onClick={async (e) => {
          e.stopPropagation();
          try {
            const result = await loadMunicipalLayer();
            if (result === 'exists') {
              toast.info('A camada municipal ja esta carregada');
            } else {
              toast.success('Camada municipal do IBGE carregada');
            }
          } catch (err: unknown) {
            toast.error(`Falha ao carregar camada municipal: ${getErrorMessage(err)}`);
          }
        }}
      >
        {loadingMunicipal ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando camada municipal...
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4" />
            Camada municipal (IBGE)
          </>
        )}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={loadingSetor || !selectedMunicipalityLabel}
        onClick={async (e) => {
          e.stopPropagation();
          try {
            const result = await loadSectorLayerFromSelection();
            if (result === 'exists') {
              toast.info('A camada de setores ja esta carregada para este municipio');
            } else {
              toast.success('Camada setorial POF carregada');
            }
          } catch (err: unknown) {
            toast.error(`Falha ao carregar camada setorial: ${getErrorMessage(err)}`);
          }
        }}
      >
        {loadingSetor ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando setores...
          </>
        ) : (
          <>
            <Map className="h-4 w-4" />
            Setores POF (municipio selecionado)
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        {selectedMunicipalityLabel
          ? `Municipio selecionado: ${selectedMunicipalityLabel}. Clique em Setores POF (base atual: Curitiba).`
          : 'Selecione um municipio no mapa para habilitar setores'}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
