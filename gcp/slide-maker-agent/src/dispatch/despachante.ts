import { CloudTasksClient } from '@google-cloud/tasks';

/**
 * Enfileira a execução de uma fase (§8). A rota pública só enfileira e responde 202; a fase roda
 * dentro da requisição `POST /internal/fase` que o Cloud Tasks abre. Nada roda em background.
 */
export interface Despachante {
  /** Devolve o nome da tarefa criada. */
  enfileirar(faseId: string): Promise<string>;
}

export interface OpcoesCloudTasks {
  projeto: string;
  regiao: string;
  fila: string;
  urlServico: string;
  contaServico: string;
  dispatchDeadlineSegundos: number;
}

export class DespachanteCloudTasks implements Despachante {
  private readonly cliente = new CloudTasksClient();

  constructor(private readonly o: OpcoesCloudTasks) {}

  async enfileirar(faseId: string): Promise<string> {
    const parent = this.cliente.queuePath(this.o.projeto, this.o.regiao, this.o.fila);
    // Nome derivado do id da fase: o Cloud Tasks recusa nome repetido, o que evita fase dobrada.
    const nome = this.cliente.taskPath(this.o.projeto, this.o.regiao, this.o.fila, `fase-${faseId}`);
    const [tarefa] = await this.cliente.createTask({
      parent,
      task: {
        name: nome,
        dispatchDeadline: { seconds: this.o.dispatchDeadlineSegundos },
        httpRequest: {
          httpMethod: 'POST',
          url: `${this.o.urlServico}/internal/fase`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ faseId })).toString('base64'),
          oidcToken: { serviceAccountEmail: this.o.contaServico, audience: this.o.urlServico },
        },
      },
    });
    return tarefa.name ?? nome;
  }
}

/** Para testes: guarda as fases enfileiradas; o teste chama `/internal/fase` explicitamente. */
export class DespachanteRegistro implements Despachante {
  readonly enfileiradas: string[] = [];
  falharProxima = false;

  async enfileirar(faseId: string): Promise<string> {
    if (this.falharProxima) {
      this.falharProxima = false;
      throw new Error('fila indisponível');
    }
    this.enfileiradas.push(faseId);
    return `registro/fase-${faseId}`;
  }
}
