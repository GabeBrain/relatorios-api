// Esquema do trabalho/deck_spec.json (INSTRUCOES §6.3–6.4). O agente escreve o spec; a brain-deck
// valida e constrói. Mensagens de erro em português, com o caminho do campo, para o agente corrigir.
import { z } from 'zod';
import { CORES } from './tema.js';

const HEX = /^[0-9A-Fa-f]{6}$/;
const num = z.number().finite();
const pos = z.number().finite().min(0);
const texto = z.string().min(1);

/** Cor: token da paleta (tema.js) ou HEX listado em cores_extra_aprovadas (validado depois). */
const Cor = z.string().refine((c) => c in CORES || HEX.test(c), {
  message: `use um token da paleta (${Object.keys(CORES).join(', ')}) ou um HEX aprovado em cores_extra_aprovadas`,
});

const Caixa = { x: pos, y: pos, w: pos, h: pos };

const Run = z.strictObject({
  texto: z.string(),
  negrito: z.boolean().optional(),
  italico: z.boolean().optional(),
  cor: Cor.optional(),
  tamanho: num.positive().optional(),
  /** Neo Sans Pro: só para números de destaque (doc 02 §4). */
  destaque: z.boolean().optional(),
  quebra: z.boolean().optional(),
});

const Texto = z.strictObject({
  tipo: z.literal('texto'),
  ...Caixa,
  texto: z.union([z.string(), z.array(Run).min(1)]),
  tamanho: num.positive().optional(),
  cor: Cor.optional(),
  negrito: z.boolean().optional(),
  destaque: z.boolean().optional(),
  alinhamento: z.enum(['left', 'center', 'right']).optional(),
  vertical: z.enum(['top', 'middle', 'bottom']).optional(),
  espaco_paragrafo: num.min(0).optional(),
  entrelinha: num.positive().optional(),
  nome: z.string().optional(),
});

const Card = z.strictObject({
  tipo: z.literal('card'),
  ...Caixa,
  valor: texto,
  rotulo: texto,
  sub: z.string().optional(),
  /** Card principal: fundo verde, valor em amarelo. */
  destaque: z.boolean().optional(),
});

const Leitura = z.strictObject({
  tipo: z.literal('leitura'),
  ...Caixa,
  /** Número de destaque no topo do callout (ex.: "3,31 → 2,79"). */
  numero: z.string().optional(),
  texto: texto,
});

const Numero = z.strictObject({
  tipo: z.literal('numero'),
  x: pos, y: pos, w: pos,
  valor: texto,
  rotulo: texto,
  sub: z.string().optional(),
  tamanho: num.min(20).max(60).optional(),
  cor_valor: Cor.optional(),
  /** Quadrado de legenda à esquerda (liga o número à cor do gráfico). */
  marcador: Cor.optional(),
});

const Fato = z.strictObject({
  tipo: z.literal('fato'),
  ...Caixa,
  destaque: texto,
  texto: texto,
});

const Painel = z.strictObject({
  tipo: z.literal('painel'),
  ...Caixa,
  valor: texto,
  rotulo: texto,
  comparacoes: z.array(z.strictObject({ valor: texto, rotulo: texto })).max(4).default([]),
  nota: z.string().optional(),
});

const ListaNumerada = z.strictObject({
  tipo: z.literal('lista_numerada'),
  ...Caixa,
  itens: z.array(z.strictObject({ titulo: texto, texto: texto })).min(2).max(5),
  /** Índice (0…) do item em destaque, com fundo verde. */
  destaque: z.number().int().min(0).optional(),
});

const Serie = z.strictObject({
  nome: texto,
  rotulos: z.array(z.string()).min(1),
  valores: z.array(num).min(1),
}).refine((s) => s.rotulos.length === s.valores.length, { message: 'rotulos e valores devem ter o mesmo tamanho' });

const Grafico = z.strictObject({
  tipo: z.literal('grafico'),
  ...Caixa,
  forma: z.enum(['colunas', 'barras', 'linhas', 'pizza', 'rosca']),
  series: z.array(Serie).min(1),
  /** Uma cor por série; com uma série só, pode ser uma cor por categoria. */
  cores: z.array(Cor).min(1),
  /** Código de formato do Excel para os rótulos de dados, ex.: '0.0"%"'. */
  formato: z.string().optional(),
  empilhado: z.enum(['normal', 'percentual']).optional(),
  legenda: z.boolean().optional(),
  eixo_min: num.optional(),
  eixo_max: num.optional(),
  rotulos: z.boolean().optional(),
  rotulo_posicao: z.enum(['fora', 'centro', 'dentro', 'base']).optional(),
  rotulo_tamanho: num.positive().optional(),
  rotulo_negrito: z.boolean().optional(),
  rotulo_cor: Cor.optional(),
  categoria_tamanho: num.positive().optional(),
  ocultar_categorias: z.boolean().optional(),
  ordem_inversa: z.boolean().optional(),
  espaco_barras: z.number().int().min(0).max(500).optional(),
  nome: z.string().optional(),
});

const Tabela = z.strictObject({
  tipo: z.literal('tabela'),
  x: pos, y: pos, w: pos,
  larguras: z.array(pos).min(1),
  cabecalho: z.array(z.string()).min(1),
  linhas: z.array(z.array(z.string())).min(1),
  altura_linha: pos.optional(),
  tamanho: num.positive().optional(),
  /** Coluna (índice) em negrito, ex.: a de variação. */
  coluna_negrito: z.number().int().min(0).optional(),
  nome: z.string().optional(),
});

const Bloco = z.strictObject({
  tipo: z.literal('bloco'),
  ...Caixa,
  cor: Cor,
  /** Blocos modulares do manual (p. 61–68): retângulo ou retângulo com um canto arredondado. */
  forma: z.enum(['retangulo', 'canto']).default('retangulo'),
  rotacao: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
  nome: z.string().optional(),
});

const Imagem = z.strictObject({
  tipo: z.literal('imagem'),
  ...Caixa,
  /** Caminho relativo ao diretório do trabalho (ex.: trabalho/assets/foto.jpg). */
  caminho: texto,
  nome: z.string().optional(),
  texto_alternativo: z.string().optional(),
  /** Crédito exibido abaixo da imagem ("Imagem: …"), exigido para fotos (F5). */
  credito: z.string().optional(),
});

export const Elemento = z.discriminatedUnion('tipo', [Texto, Card, Leitura, Numero, Fato, Painel, ListaNumerada, Grafico, Tabela, Bloco, Imagem]);

const Secao = z.strictObject({ titulo: texto, etiqueta: texto });
const base = { notas: texto, secao: Secao.optional() };

const Capa = z.strictObject({
  tipo: z.literal('capa'),
  ...base,
  titulo: texto,
  subtitulo: z.string().optional(),
  palestrante: texto,
  /** Linha abaixo do palestrante: cargo · empresa · evento · cidade · data. */
  detalhes: z.string().optional(),
});

const Divisor = z.strictObject({
  tipo: z.literal('divisor'),
  ...base,
  numero: texto,
  titulo: texto,
  subtitulo: z.string().optional(),
});

const Conteudo = z.strictObject({
  tipo: z.literal('conteudo'),
  ...base,
  /** Etiqueta da seção; se omitida, usa a da seção corrente. */
  etiqueta: z.string().optional(),
  titulo: texto,
  /** caixa_alta: título curto em Neo Sans (≤ 8 palavras). afirmacao: frase longa em Montserrat Bold. */
  estilo_titulo: z.enum(['caixa_alta', 'afirmacao']).default('caixa_alta'),
  apoio: z.string().optional(),
  sub: z.string().optional(),
  fonte: z.string().optional(),
  elementos: z.array(Elemento).default([]),
});

const Final = z.strictObject({
  tipo: z.literal('final'),
  ...base,
  responsavel: z.enum(['fabio', 'guilherme', 'finoti']),
});

/** Slide institucional de contato (manual p. 104), para responsável sem slide final próprio. */
const Contato = z.strictObject({ tipo: z.literal('contato'), ...base });

export const Slide = z.discriminatedUnion('tipo', [Capa, Divisor, Conteudo, Final, Contato]);

export const DeckSpec = z.strictObject({
  titulo: texto,
  slides: z.array(Slide).min(1),
  cores_extra_aprovadas: z.array(z.string().regex(HEX, 'HEX de 6 dígitos, sem #')).default([]),
}).superRefine((spec, ctx) => {
  const extras = new Set(spec.cores_extra_aprovadas.map((c) => c.toUpperCase()));
  const visitar = (v, caminho) => {
    if (Array.isArray(v)) return v.forEach((x, i) => visitar(x, [...caminho, i]));
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        const ehCor = ['cor', 'cor_valor', 'marcador', 'rotulo_cor'].includes(k) || caminho.at(-1) === 'cores';
        if (ehCor && typeof x === 'string' && !(x in CORES) && !extras.has(x.toUpperCase())) {
          ctx.addIssue({ code: 'custom', path: [...caminho, k], message: `cor ${x} fora da paleta e de cores_extra_aprovadas` });
        }
        if (k === 'cores' && Array.isArray(x)) {
          x.forEach((c, i) => {
            if (!(c in CORES) && !extras.has(String(c).toUpperCase())) {
              ctx.addIssue({ code: 'custom', path: [...caminho, k, i], message: `cor ${c} fora da paleta e de cores_extra_aprovadas` });
            }
          });
        } else visitar(x, [...caminho, k]);
      }
    }
  };
  visitar(spec.slides, ['slides']);
  if (spec.slides[0].tipo !== 'capa') ctx.addIssue({ code: 'custom', path: ['slides', 0], message: 'o primeiro slide deve ser a capa' });
  const ultimo = spec.slides.at(-1).tipo;
  if (ultimo !== 'final' && ultimo !== 'contato') {
    ctx.addIssue({ code: 'custom', path: ['slides', spec.slides.length - 1], message: 'o último slide deve ser o slide final do responsável (tipo "final") ou o de contato' });
  }
});

/** Valida e devolve o spec normalizado, ou lança Error com a lista de problemas. */
export function validarSpec(dados) {
  const r = DeckSpec.safeParse(dados);
  if (!r.success) throw new Error(`deck_spec.json inválido:\n${z.prettifyError(r.error)}`);
  return r.data;
}
