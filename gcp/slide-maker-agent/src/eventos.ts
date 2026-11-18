import type { Estado, Fase } from './shared/state-machine.js';

/** Payload do Broadcast: só sinaliza mudança. O conteúdo vem do `GET /jobs/:id` com token (§7.3). */
export interface EventoTrabalho {
  estado: Estado;
  fase: Fase | null;
  etapa?: string;
  versao_atual: number;
}

export interface Eventos {
  emitir(jobId: string, evento: EventoTrabalho): Promise<void>;
}

export const canalDoTrabalho = (jobId: string) => `slide-maker:${jobId}`;

/**
 * Broadcast do Supabase Realtime pela API REST. Melhor esforço: a falha é registrada sem dados do
 * trabalho e não interrompe a fase, porque o frontend também consulta o estado periodicamente.
 */
export class EventosBroadcast implements Eventos {
  constructor(
    private readonly supabaseUrl: string,
    private readonly chave: string,
    private readonly log: (msg: string) => void,
  ) {}

  async emitir(jobId: string, evento: EventoTrabalho) {
    try {
      const r = await fetch(`${this.supabaseUrl}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: { apikey: this.chave, Authorization: `Bearer ${this.chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ topic: canalDoTrabalho(jobId), event: 'estado', payload: evento }] }),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) this.log(`broadcast job=${jobId} status=${r.status}`);
    } catch {
      this.log(`broadcast job=${jobId} falhou`);
    }
  }
}

export class EventosMemoria implements Eventos {
  readonly emitidos: { jobId: string; evento: EventoTrabalho }[] = [];
  async emitir(jobId: string, evento: EventoTrabalho) {
    this.emitidos.push({ jobId, evento });
  }
}
