import { describe, expect, it } from 'vitest';
import { montarRespostas, mensagensVisiveis, OUTRO, situacao, validarArquivos } from './chat';
import type { DetalheTrabalho, Mensagem, Trabalho } from '../types';

const trabalho = (t: Partial<Trabalho>): Trabalho => ({
  id: 'j', created_at: '2026-11-12T10:00:00Z', updated_at: '2026-11-12T10:00:00Z', titulo: 'Deck', contexto: null,
  colaborador_email: 'd@brain.srv.br', responsavel: null, estado: 'rascunho', fase_em_curso: null, erro_fase: null,
  versao_atual: 0, erro: null, ...t,
});
let seq = 0;
const msg = (tipo: Mensagem['tipo'], autor: Mensagem['autor'], hora: string, conteudo: Record<string, unknown> = {}): Mensagem =>
  ({ id: `m${++seq}`, job_id: 'j', created_at: `2026-11-12T${hora}Z`, autor, tipo, conteudo } as Mensagem);
const detalhe = (t: Partial<Trabalho>, mensagens: Mensagem[]): DetalheTrabalho => ({ trabalho: trabalho(t), mensagens, versoes: [] });

describe('situação do chat', () => {
  it('card ativo: últimas perguntas aguardando respostas; última narrativa aguardando aprovação', () => {
    const p1 = msg('perguntas', 'agente', '10:01:00');
    const n1 = msg('narrativa', 'agente', '10:05:00');
    const n2 = msg('narrativa', 'agente', '10:09:00');
    expect(situacao(detalhe({ estado: 'aguardando_respostas' }, [p1])).idCardAtivo).toBe(p1.id);
    expect(situacao(detalhe({ estado: 'aguardando_aprovacao' }, [p1, n1, n2])).idCardAtivo).toBe(n2.id);
    expect(situacao(detalhe({ estado: 'produzindo' }, [p1, n2])).idCardAtivo).toBeNull();
  });

  it('em execução: etapa real mais recente desta fase e início na última ação do usuário', () => {
    const d = detalhe({ estado: 'produzindo' }, [
      msg('progresso', 'sistema', '10:02:00', { etapa: 'Lendo arquivos', fase: 'F1' }),
      msg('aprovacao', 'usuario', '10:10:00', { acao: 'aprovar' }),
      msg('progresso', 'sistema', '10:11:00', { etapa: 'Produzindo slides', fase: 'F3' }),
    ]);
    const s = situacao(d);
    expect(s).toMatchObject({ emExecucao: true, etapa: 'Produzindo slides', podeAjustar: false });
    expect(s.inicioFase).toBe(Date.parse('2026-11-12T10:10:00Z'));
  });

  it('sem progresso informado ainda, a etapa padrão do estado; etapa de fase anterior não vale', () => {
    const d = detalhe({ estado: 'pesquisando_e_narrando' }, [
      msg('progresso', 'sistema', '10:02:00', { etapa: 'Lendo arquivos', fase: 'F1' }),
      msg('respostas', 'usuario', '10:05:00', { respostas: {} }),
    ]);
    expect(situacao(d).etapa).toBe('Montando a narrativa');
  });

  it('retomada depois de erro: o cronômetro parte da transição, não da mensagem de erro', () => {
    const d = detalhe({ estado: 'analisando', updated_at: '2026-11-12T11:00:00Z' }, [
      msg('arquivos', 'usuario', '10:00:00', { arquivos: [] }),
      msg('erro', 'sistema', '10:20:00', { mensagem: 'x', fase: 'F1' }),
    ]);
    expect(situacao(d).inicioFase).toBe(Date.parse('2026-11-12T11:00:00Z'));
  });

  it('ajuste pelo chat só com o deck entregue; progresso não aparece no histórico', () => {
    expect(situacao(detalhe({ estado: 'entregue', versao_atual: 1 }, [])).podeAjustar).toBe(true);
    expect(situacao(detalhe({ estado: 'aguardando_aprovacao' }, [])).podeAjustar).toBe(false);
    const visiveis = mensagensVisiveis([msg('texto', 'usuario', '10:00:00'), msg('progresso', 'sistema', '10:01:00')]);
    expect(visiveis.map((m) => m.tipo)).toEqual(['texto']);
  });
});

describe('respostas do card de perguntas', () => {
  const perguntas = [{ pergunta: 'Quem apresenta?', multipla: false }, { pergunta: 'Quais blocos?', multipla: true }];

  it('só monta quando todas têm resposta; "Outro" exige texto', () => {
    expect(montarRespostas(perguntas, { 'Quem apresenta?': { opcoes: ['Fábio'], outro: '' } })).toBeNull();
    expect(montarRespostas(perguntas, {
      'Quem apresenta?': { opcoes: [OUTRO], outro: '' }, 'Quais blocos?': { opcoes: ['Mercado'], outro: '' },
    })).toBeNull();
    expect(montarRespostas(perguntas, {
      'Quem apresenta?': { opcoes: [OUTRO], outro: '  Ana Souza ' }, 'Quais blocos?': { opcoes: ['Mercado', 'Regulação'], outro: '' },
    })).toEqual({ 'Quem apresenta?': 'Ana Souza', 'Quais blocos?': ['Mercado', 'Regulação'] });
  });
});

describe('validação de arquivos antes do envio', () => {
  const arquivo = (nome: string, bytes: number) => new File([new Uint8Array(bytes)], nome);
  it('tipo, tamanho, vazio e quantidade', () => {
    expect(validarArquivos([arquivo('a.pdf', 10), arquivo('b.XLSX', 10)])).toEqual([]);
    expect(validarArquivos([arquivo('a.exe', 10)])[0]!.motivo).toBe('Tipo de arquivo não aceito.');
    expect(validarArquivos([arquivo('a.pdf', 0)])[0]!.motivo).toBe('Arquivo vazio.');
    expect(validarArquivos([{ name: 'm.pdf', size: 199 * 1024 * 1024 } as File])).toEqual([]);
    expect(validarArquivos([{ name: 'g.pdf', size: 201 * 1024 * 1024 } as File])[0]!.motivo).toBe('Maior que 200 MB.');
    const tres = [1, 2, 3].map((i) => ({ name: `${i}.pdf`, size: 190 * 1024 * 1024 }) as File);
    expect(validarArquivos(tres).map((p) => p.motivo)).toEqual(['Os arquivos somam mais de 500 MB, o limite por apresentação.']);
    expect(validarArquivos(Array.from({ length: 11 }, (_, i) => arquivo(`${i}.pdf`, 1)))[0]!.motivo).toBe('Envie no máximo 10 arquivos.');
  });
});
