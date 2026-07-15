import { Map, Archive, Layers, Building2, Upload } from 'lucide-react';

export default function MapaLegado() {
  return (
    <div className="flex flex-col h-full items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full border border-border bg-muted p-6">
            <Map className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Mapa Geoespacial</h1>
          <p className="text-sm text-muted-foreground">
            A versão ativa desta funcionalidade está sendo desenvolvida em paralelo
            por outro time, fora deste repositório.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-4 text-left space-y-3">
          <p className="text-sm font-medium">O que esta versão fazia:</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Camadas socioeconômicas municipais (IBGE 2024)
            </li>
            <li className="flex items-start gap-2">
              <Layers className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Setores POF 2022 (Curitiba / Goiânia / Maceió) e estudo de caso Av. Kennedy (Curitiba)
            </li>
            <li className="flex items-start gap-2">
              <Upload className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Upload de KML / KMZ / GeoJSON com análise espacial
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Archive className="h-3.5 w-3.5" />
          <span>
            Código preservado em <code className="bg-muted px-1 py-0.5 rounded">src/legacy/mapa/</code>;
            dados no histórico git.
          </span>
        </div>
      </div>
    </div>
  );
}
