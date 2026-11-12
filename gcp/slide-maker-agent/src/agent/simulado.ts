import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Agente, ParametrosAgente, ResultadoAgente } from './agente.js';

/**
 * Agente simulado (§13, §14 item 2): percorre as fases chamando as ferramentas `brain` como o agente
 * real faria, sem chamar modelo. Serve para os testes de integração e para ensaiar o serviço sem
 * custo. O roteiro pode ser substituído por teste.
 */
export type Roteiro = (p: ParametrosAgente) => Promise<ResultadoAgente>;

export class AgenteSimulado implements Agente {
  constructor(private readonly roteiro: Roteiro = roteiroPadrao) {}
  executar(p: ParametrosAgente) {
    return this.roteiro(p);
  }
}

/** Escreve um arquivo no workspace (o agente real faz isso com Write/Bash). */
async function escrever(cwd: string, rel: string, conteudo: string | Uint8Array) {
  const alvo = join(cwd, rel);
  await mkdir(join(alvo, '..'), { recursive: true });
  await writeFile(alvo, conteudo);
}

/**
 * PPTX mínimo: um ZIP vazio válido (só o registro de fim de diretório precedido da assinatura de
 * arquivo local). Basta para o validador básico da Fase 2; a Fase 3 troca por um deck real.
 */
export function pptxFicticio(): Uint8Array {
  const local = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  return Buffer.concat([local, fim]);
}

export const roteiroPadrao: Roteiro = async ({ fase, cwd, job, ferramentas: f }) => {
  const chamar = async (nome: string, entrada: unknown) => {
    const r = await f.chamar(nome, entrada);
    if (!r.ok) throw new Error(`simulado: ${nome} recusada: ${r.texto}`);
  };
  switch (fase) {
    case 'F1':
      await chamar('informar_etapa', { etapa: 'Lendo arquivos' });
      await escrever(cwd, 'trabalho/inventario.json', JSON.stringify({ simulado: true }));
      if (job.contexto?.includes('#sem-perguntas')) {
        await escrever(cwd, 'briefing.yaml', 'responsavel: fabio\n');
        await chamar('concluir_intake', { resumo: 'Briefing completo no contexto.' });
      } else {
        await chamar('perguntar_usuario', {
          perguntas: [{
            pergunta: 'Quem será o responsável pela apresentação?',
            cabecalho: 'Responsável',
            multipla: false,
            opcoes: [
              { rotulo: 'Fábio Tadeu Araújo', descricao: 'CEO', recomendada: true },
              { rotulo: 'Guilherme Werner', descricao: 'Sócio-Consultor' },
              { rotulo: 'Lucas Finoti', descricao: 'Especialista de Inteligência de Mercado' },
            ],
          }],
        });
      }
      return { tipo: 'fim' };
    case 'F2':
      await chamar('informar_etapa', { etapa: 'Pesquisando dados' });
      await chamar('informar_etapa', { etapa: 'Montando a narrativa' });
      await escrever(cwd, 'trabalho/narrativa.md', 'TESE: narrativa simulada\n');
      await chamar('submeter_narrativa', {
        tese: 'Narrativa simulada para teste do fluxo.',
        resumo_diagnostico: 'Diagnóstico simulado.',
        atualizacoes: [],
        slides: [{ n: 1, bloco: 'Abertura', titulo: 'Capa', visual: 'capa', minutos: 0.5 }],
        tempo_total_min: 15,
        responsavel: 'fabio',
      });
      return { tipo: 'fim' };
    case 'F3':
    case 'F4': {
      const versao = job.versao_atual + 1;
      await chamar('informar_etapa', { etapa: 'Produzindo slides' });
      await escrever(cwd, 'trabalho/deck_spec.json', JSON.stringify({ versao, slides: 1 }));
      const arquivo = `saida/Brain_simulado_v${versao}.pptx`;
      await escrever(cwd, arquivo, pptxFicticio());
      await chamar('informar_etapa', { etapa: 'Revisando o visual' });
      await chamar('registrar_relatorio', { markdown: `# Relatório simulado v${versao}` });
      await chamar('entregar_deck', {
        arquivo, versao,
        mudancas: fase === 'F4' ? ['Ajuste simulado'] : [],
        qa: { falhas_bloqueantes: 0, alertas: [], notas_rubrica: { Tese: 4 } },
      });
      return { tipo: 'fim' };
    }
  }
};
