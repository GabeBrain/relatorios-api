// brain-deck: constrói o .pptx Brain a partir de trabalho/deck_spec.json (INSTRUCOES §6.4).
// Extraída do build aprovado docs/features/slide-maker/referencia/build_domicilios_v3.js:
// mesmos layouts (Capa, Divisor, Conteudo, SlideFinal), geometria, cores e componentes.
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import pptxgen from 'pptxgenjs';
import { applyTheme } from '../apply_theme.js';
import { validarSpec } from './spec.js';
import { CORES, FONTE_CORPO, FONTE_TITULO, SLIDE, TEMA, cor, hex } from './tema.js';

const NOME_RESPONSAVEL = { fabio: 'Fábio Tadeu Araújo', guilherme: 'Guilherme Werner', finoti: 'Lucas Finoti' };

/** Cor do spec: token → cor de tema/HEX; HEX aprovado (cores_extra_aprovadas) passa direto. */
const c = (v) => (v in CORES ? cor(v) : v.toUpperCase());
const h = (v) => (v in CORES ? hex(v) : v.toUpperCase());

function lerManifesto(marca) {
  const arq = join(marca, 'derivados', 'manifesto.json');
  if (!existsSync(arq)) throw new Error(`marca não preparada: rode "python lib/preparar_marca.py ${marca}" (falta ${arq})`);
  return JSON.parse(readFileSync(arq, 'utf8'));
}

function definirLayouts(pres, marca, manifesto) {
  const C = pres.SchemeColor;
  const der = (n) => join(marca, 'derivados', n);
  const prop = (n) => manifesto.logos[n].proporcao;
  // Logo: rodapé SEM tagline (pequena, < 2″); capa COM tagline (grande). Doc 02 §2.
  const LW = 1.2;
  const logoRodape = (escuro) => {
    const n = escuro ? 'logo_branco_sem.png' : 'logo_sem.png';
    return { image: { x: SLIDE.w - 0.6 - LW, y: 6.95, w: LW, h: LW / prop(n), path: der(n) } };
  };

  pres.defineSlideMaster({
    title: 'Capa',
    background: { color: C.accent1 },
    objects: [
      { image: { x: 0.8, y: 0.8, w: 3.2, h: 3.2 / prop('logo_branco_tag.png'), path: der('logo_branco_tag.png') } },
      { placeholder: { options: { name: 'title', type: 'title', align: 'left', x: 0.8, y: 2.3, w: 7.8, h: 2.2, fontFace: FONTE_TITULO, fontSize: 46, bold: true, color: C.background1, valign: 'bottom', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.7, w: 7.4, h: 1.0, fontSize: 18, color: C.background1, valign: 'top', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'rodape', type: 'body', x: 0.8, y: 6.3, w: 7, h: 0.6, fontSize: 13, color: C.accent2, bold: true, valign: 'top', margin: 0 }, text: '' } },
    ],
  });
  pres.defineSlideMaster({
    title: 'Divisor',
    background: { color: C.accent1 },
    objects: [
      { placeholder: { options: { name: 'numero', type: 'body', x: 0.8, y: 1.5, w: 4, h: 1.6, fontFace: FONTE_TITULO, fontSize: 96, bold: true, color: C.accent2, valign: 'bottom', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', align: 'left', x: 0.8, y: 3.3, w: 8.5, h: 1.5, fontFace: FONTE_TITULO, fontSize: 36, bold: true, color: C.background1, valign: 'top', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.9, w: 8.5, h: 0.8, fontSize: 16, color: C.background1, valign: 'top', margin: 0 }, text: '' } },
      logoRodape(true),
    ],
  });
  pres.defineSlideMaster({
    title: 'Conteudo',
    background: { color: C.background1 },
    slideNumber: { x: 10.85, y: 6.98, w: 0.5, h: 0.3, fontFace: FONTE_CORPO, fontSize: 10, color: 'BCBEC0', align: 'right' },
    objects: [
      { placeholder: { options: { name: 'tag', type: 'body', x: 0.6, y: 0.3, w: 10, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 1, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', align: 'left', x: 0.6, y: 0.62, w: 12.1, h: 0.6, fontFace: FONTE_TITULO, fontSize: 30, bold: true, color: C.text2, valign: 'top', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'apoio', type: 'body', x: 0.6, y: 1.25, w: 12.1, h: 0.5, fontSize: 18, bold: true, color: C.text1, valign: 'top', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'sub', type: 'body', x: 0.6, y: 1.8, w: 12.1, h: 0.35, fontSize: 12, color: C.text1, valign: 'top', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'fonte', type: 'body', x: 0.6, y: 6.9, w: 10.0, h: 0.42, fontSize: 9, color: '58595B', valign: 'middle', margin: 0 }, text: '' } },
      logoRodape(false),
    ],
  });
  pres.defineSlideMaster({ title: 'SlideFinal', background: { color: C.background1 }, objects: [] });
}

// ---------------------------------------------------------------- componentes
// Cada função recebe o slide, o elemento do spec e um contador para nomear objetos (objetos nomeados, doc 03 etapa 4).

function runs(v, padrao = {}) {
  if (typeof v === 'string') return v;
  return v.map((r) => ({
    text: r.texto,
    options: {
      ...(r.negrito !== undefined && { bold: r.negrito }),
      ...(r.italico && { italic: true }),
      ...(r.cor && { color: c(r.cor) }),
      ...(r.tamanho && { fontSize: r.tamanho }),
      ...(r.destaque && { fontFace: FONTE_TITULO }),
      ...(r.quebra && { breakLine: true }),
      ...padrao,
    },
  }));
}

function criarComponentes(pres, base) {
  const C = pres.SchemeColor;
  let n = 0;
  const caixa = (s, x, y, w, hh, fill, nome) => s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: hh, fill: { color: fill }, line: { type: 'none' }, objectName: nome ?? `fundo ${++n}` });
  const texto = (s, t, o) => s.addText(t, { margin: 0, isTextBox: true, objectName: o.objectName ?? `texto ${++n}`, ...o });
  const eixos = () => ({
    catAxisLabelColor: '58595B', valAxisLabelColor: '58595B',
    catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt', legendFontFace: '+mn-lt',
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 10, dataLabelFontSize: 12, legendFontSize: 11,
    valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, valAxisHidden: true,
    catAxisLineShow: true, catAxisLineColor: 'BCBEC0', valAxisLineShow: false, valAxisLineColor: 'BCBEC0', dataLabelColor: '58595B', showLegend: false,
  });

  const comp = {
    texto(s, e) {
      texto(s, runs(e.texto), {
        x: e.x, y: e.y, w: e.w, h: e.h,
        fontSize: e.tamanho ?? 14, color: c(e.cor ?? 'texto'),
        ...(e.negrito && { bold: true }),
        ...(e.destaque && { fontFace: FONTE_TITULO }),
        ...(e.alinhamento && { align: e.alinhamento }),
        valign: e.vertical ?? 'top',
        ...(e.espaco_paragrafo !== undefined && { paraSpaceAfter: e.espaco_paragrafo }),
        ...(e.entrelinha && { lineSpacingMultiple: e.entrelinha }),
        ...(e.nome && { objectName: e.nome }),
      });
    },

    card(s, e) {
      const { x, y, w, h: hh } = e;
      const hero = !!e.destaque;
      caixa(s, x, y, w, hh, hero ? C.accent1 : C.background2);
      texto(s, e.valor, { x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 1.1, fontFace: FONTE_TITULO, fontSize: 50, bold: true, color: hero ? C.accent2 : C.accent1, valign: 'bottom' });
      texto(s, e.rotulo, { x: x + 0.3, y: y + 1.45, w: w - 0.6, h: 0.75, fontSize: 15, bold: true, color: hero ? C.background1 : C.text1, valign: 'top' });
      if (e.sub) texto(s, e.sub, { x: x + 0.3, y: y + hh - 0.6, w: w - 0.6, h: 0.4, fontSize: 12, color: hero ? C.background1 : C.text1 });
    },

    leitura(s, e) {
      const { x, y, w, h: hh } = e;
      caixa(s, x, y, w, hh, C.accent1);
      const corpo = [
        { text: 'LEITURA BRAIN', options: { bold: true, fontSize: 11, color: C.accent2, charSpacing: 1, breakLine: true } },
        { text: ' ', options: { fontSize: 6, breakLine: true } },
      ];
      if (e.numero) corpo.push({ text: e.numero, options: { bold: true, fontSize: 24, color: C.accent2, fontFace: FONTE_TITULO, breakLine: true } });
      corpo.push({ text: e.texto });
      texto(s, corpo, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: hh - 0.4, fontSize: 15, color: C.background1, valign: 'middle', paraSpaceAfter: 4 });
    },

    numero(s, e) {
      const tam = e.tamanho ?? 36;
      let x = e.x;
      if (e.marcador) {
        s.addShape(pres.shapes.RECTANGLE, { x, y: e.y + 0.15, w: 0.18, h: 0.18, fill: { color: c(e.marcador) }, line: { type: 'none' }, objectName: `marcador ${++n}` });
        x += 0.3;
      }
      const w = e.marcador ? e.w - 0.3 : e.w;
      const hv = Math.round((tam / 48) * 100) / 100;
      texto(s, e.valor, { x, y: e.y, w, h: hv, fontFace: FONTE_TITULO, fontSize: tam, bold: true, color: c(e.cor_valor ?? 'verde'), valign: 'bottom' });
      texto(s, e.rotulo, { x, y: e.y + hv + 0.05, w, h: 0.4, fontSize: 15, bold: true, color: C.text1, valign: 'top' });
      if (e.sub) texto(s, e.sub, { x, y: e.y + hv + 0.45, w, h: 0.7, fontSize: 12, color: C.text1, valign: 'top' });
    },

    fato(s, e) {
      caixa(s, e.x, e.y, e.w, e.h, C.background2);
      texto(s, [{ text: `${e.destaque}  `, options: { bold: true, color: C.accent1, fontSize: 16 } }, { text: e.texto, options: { fontSize: 12, color: C.text1 } }],
        { x: e.x + 0.2, y: e.y, w: e.w - 0.35, h: e.h, valign: 'middle' });
    },

    painel(s, e) {
      const { x, y, w, h: hh } = e;
      caixa(s, x, y, w, hh, C.accent1);
      texto(s, e.valor, { x: x + 0.3, y: y + 0.15, w: w - 0.5, h: 1.1, fontFace: FONTE_TITULO, fontSize: 54, bold: true, color: C.accent2, valign: 'bottom' });
      texto(s, e.rotulo, { x: x + 0.3, y: y + 1.3, w: w - 0.5, h: 0.7, fontSize: 14, color: C.background1, valign: 'top' });
      const linhas = [];
      for (const cmp of e.comparacoes) {
        linhas.push({ text: cmp.valor, options: { bold: true, fontSize: 30, color: C.background1, fontFace: FONTE_TITULO } });
        linhas.push({ text: `   ${cmp.rotulo}`, options: { fontSize: 13, color: C.background1, breakLine: true } });
      }
      if (e.nota) linhas.push({ text: e.nota, options: { fontSize: 13, color: C.accent2, bold: true } });
      if (linhas.length) texto(s, linhas, { x: x + 0.3, y: y + 2.1, w: w - 0.5, h: Math.max(0.5, hh - 2.3), valign: 'top', paraSpaceAfter: 4 });
    },

    lista_numerada(s, e) {
      const gap = 0.3;
      const k = e.itens.length;
      const w = (e.w - gap * (k - 1)) / k;
      e.itens.forEach((it, i) => {
        const x = e.x + i * (w + gap);
        const y = e.y;
        const escuro = i === e.destaque;
        caixa(s, x, y, w, e.h, escuro ? C.accent1 : C.background2);
        s.addShape('round1Rect', { x: x + 0.3, y: y + 0.3, w: 0.75, h: 0.75, fill: { color: escuro ? C.accent2 : C.accent1 }, line: { type: 'none' }, objectName: `bloco numero ${i + 1}` });
        texto(s, String(i + 1), { x: x + 0.3, y: y + 0.3, w: 0.75, h: 0.75, fontFace: FONTE_TITULO, fontSize: 28, bold: true, color: escuro ? C.accent1 : C.accent2, align: 'center', valign: 'middle' });
        texto(s, it.titulo, { x: x + 0.3, y: y + 1.25, w: w - 0.6, h: 0.95, fontSize: 17, bold: true, color: escuro ? C.accent2 : C.accent1, valign: 'top' });
        texto(s, it.texto, { x: x + 0.3, y: y + 2.25, w: w - 0.6, h: Math.max(0.5, e.h - 2.4), fontSize: 14, color: escuro ? C.background1 : C.text1, valign: 'top', lineSpacingMultiple: 1.15 });
      });
    },

    grafico(s, e) {
      const tipo = { colunas: pres.charts.BAR, barras: pres.charts.BAR, linhas: pres.charts.LINE, pizza: pres.charts.PIE, rosca: pres.charts.DOUGHNUT }[e.forma];
      const dados = e.series.map((sr) => ({ name: sr.nome, labels: sr.rotulos, values: sr.valores }));
      const pos = { fora: 'outEnd', centro: 'ctr', dentro: 'inEnd', base: 'inBase' };
      const circular = e.forma === 'pizza' || e.forma === 'rosca';
      const o = {
        x: e.x, y: e.y, w: e.w, h: e.h,
        ...eixos(),
        chartColors: e.cores.map(h),
        showValue: e.rotulos ?? true,
        objectName: e.nome ?? `grafico ${++n}`,
      };
      if (!circular) o.barDir = e.forma === 'barras' ? 'bar' : 'col';
      if (e.empilhado) o.barGrouping = e.empilhado === 'percentual' ? 'percentStacked' : 'stacked';
      if (e.formato) o.dataLabelFormatCode = e.formato;
      if (e.legenda) Object.assign(o, { showLegend: true, legendPos: 't' });
      if (e.eixo_min !== undefined) o.valAxisMinVal = e.eixo_min;
      if (e.eixo_max !== undefined) o.valAxisMaxVal = e.eixo_max;
      if (e.rotulo_posicao) o.dataLabelPosition = pos[e.rotulo_posicao];
      else if (!circular) o.dataLabelPosition = 'outEnd';
      if (e.rotulo_tamanho) o.dataLabelFontSize = e.rotulo_tamanho;
      if (e.rotulo_negrito) o.dataLabelFontBold = true;
      if (e.rotulo_cor) o.dataLabelColor = h(e.rotulo_cor);
      if (e.categoria_tamanho) o.catAxisLabelFontSize = e.categoria_tamanho;
      if (e.ocultar_categorias) o.catAxisHidden = true;
      if (e.ordem_inversa) o.catAxisOrientation = 'maxMin';
      if (e.espaco_barras !== undefined) o.barGapWidthPct = e.espaco_barras;
      if (circular) Object.assign(o, { showPercent: false, showLegend: e.legenda ?? true, legendPos: 'r' });
      s.addChart(tipo, dados, o);
    },

    tabela(s, e) {
      const tam = e.tamanho ?? 13;
      const H = { bold: true, color: 'FFFFFF', fill: { color: hex('verde_escuro') }, fontSize: tam - 1 };
      const rows = [
        e.cabecalho.map((t, j) => ({ text: t, options: { ...H, ...(j && { align: 'right' }) } })),
        ...e.linhas.map((r, i) => r.map((t, j) => ({
          text: t,
          options: { fontSize: tam, color: '58595B', align: j ? 'right' : 'left', bold: j === e.coluna_negrito, fill: { color: i % 2 ? hex('cinza_claro') : 'FFFFFF' } },
        }))),
      ];
      s.addTable(rows, { x: e.x, y: e.y, w: e.w, colW: e.larguras, rowH: e.altura_linha ?? 0.52, border: { type: 'solid', pt: 0.5, color: 'BCBEC0' }, fontFace: FONTE_CORPO, valign: 'middle', objectName: e.nome ?? `tabela ${++n}` });
    },

    bloco(s, e) {
      s.addShape(e.forma === 'canto' ? 'round1Rect' : pres.shapes.RECTANGLE, {
        x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: c(e.cor) }, line: { type: 'none' },
        ...(e.rotacao && { rotate: e.rotacao }),
        objectName: e.nome ?? `bloco modular ${++n}`,
      });
    },

    imagem(s, e) {
      const caminho = isAbsolute(e.caminho) ? e.caminho : resolve(base, e.caminho);
      const rel = relative(base, caminho);
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`imagem fora do diretório do trabalho: ${e.caminho}`);
      if (!existsSync(caminho)) throw new Error(`imagem não encontrada: ${e.caminho}`);
      s.addImage({ path: caminho, x: e.x, y: e.y, w: e.w, h: e.h, objectName: e.nome ?? `imagem ${++n}`, ...(e.texto_alternativo && { altText: e.texto_alternativo }) });
      if (e.credito) texto(s, `Imagem: ${e.credito}`, { x: e.x, y: e.y + e.h + 0.04, w: e.w, h: 0.25, fontSize: 8, color: C.text1 });
    },
  };
  return comp;
}

// ---------------------------------------------------------------- construção

/**
 * @param {unknown} dados conteúdo do deck_spec.json
 * @param {{ marca: string, base: string, saida: string }} o
 *   marca: pasta de ativos (com derivados/ preparados); base: diretório do trabalho (imagens relativas); saida: .pptx
 */
export async function construirDeck(dados, o) {
  const spec = validarSpec(dados);
  const manifesto = lerManifesto(o.marca);
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Brain Inteligência Estratégica';
  pres.company = 'Brain Inteligência Estratégica';
  pres.title = spec.titulo;
  pres.theme = { headFontFace: TEMA.headFontFace, bodyFontFace: TEMA.bodyFontFace };
  const C = pres.SchemeColor;
  definirLayouts(pres, o.marca, manifesto);
  const comp = criarComponentes(pres, o.base);

  let secao = 'Abertura';
  let etiqueta = 'ABERTURA';
  let secaoCriada = false;
  for (const [i, sl] of spec.slides.entries()) {
    if (sl.secao) {
      secao = sl.secao.titulo;
      etiqueta = sl.secao.etiqueta;
      pres.addSection({ title: secao });
      secaoCriada = true;
    } else if (!secaoCriada) {
      pres.addSection({ title: secao });
      secaoCriada = true;
    }
    let s;
    switch (sl.tipo) {
      case 'capa': {
        s = pres.addSlide({ masterName: 'Capa', sectionTitle: secao });
        s.addText(sl.titulo.toUpperCase(), { placeholder: 'title' });
        if (sl.subtitulo) s.addText(sl.subtitulo, { placeholder: 'body' });
        const rodape = [{ text: sl.palestrante, options: { breakLine: !!sl.detalhes } }];
        if (sl.detalhes) rodape.push({ text: sl.detalhes, options: { bold: false, color: C.background1 } });
        s.addText(rodape, { placeholder: 'rodape' });
        // Composição de blocos modulares (manual p. 61–68), como na referência aprovada.
        s.addShape(pres.shapes.RECTANGLE, { x: 9.4, y: 0, w: 3.93, h: 3.75, fill: { color: C.accent2 }, line: { type: 'none' }, objectName: 'bloco modular 1' });
        s.addShape('round1Rect', { x: 9.4, y: 3.75, w: 3.93, h: 3.75, fill: { color: C.accent5 }, line: { type: 'none' }, objectName: 'bloco modular 2' });
        s.addShape('round1Rect', { x: 11.33, y: 1.75, w: 2.0, h: 2.0, fill: { color: C.accent1 }, line: { type: 'none' }, rotate: 180, objectName: 'bloco modular 3' });
        break;
      }
      case 'divisor': {
        s = pres.addSlide({ masterName: 'Divisor', sectionTitle: secao });
        s.addText(sl.numero, { placeholder: 'numero' });
        s.addText(sl.titulo.toUpperCase(), { placeholder: 'title' });
        if (sl.subtitulo) s.addText(sl.subtitulo, { placeholder: 'body' });
        s.addShape(pres.shapes.RECTANGLE, { x: 10.2, y: 0, w: 3.13, h: 3.2, fill: { color: C.accent2 }, line: { type: 'none' }, objectName: 'bloco modular 1' });
        s.addShape('round1Rect', { x: 10.2, y: 3.4, w: 3.13, h: 2.6, fill: { color: C.accent5 }, line: { type: 'none' }, objectName: 'bloco modular 2' });
        break;
      }
      case 'conteudo': {
        s = pres.addSlide({ masterName: 'Conteudo', sectionTitle: secao });
        s.addText(sl.etiqueta ?? etiqueta, { placeholder: 'tag' });
        if (sl.estilo_titulo === 'afirmacao') s.addText(sl.titulo, { placeholder: 'title', fontFace: FONTE_CORPO, fontSize: 26 });
        else s.addText(sl.titulo.toUpperCase(), { placeholder: 'title' });
        if (sl.apoio) s.addText(sl.apoio, { placeholder: 'apoio' });
        if (sl.sub) s.addText(sl.sub, { placeholder: 'sub' });
        if (sl.fonte) s.addText(sl.fonte, { placeholder: 'fonte' });
        for (const [j, e] of sl.elementos.entries()) {
          try {
            comp[e.tipo](s, e);
          } catch (err) {
            throw new Error(`slide ${i + 1}, elemento ${j + 1} (${e.tipo}): ${err.message}`);
          }
        }
        break;
      }
      case 'final': {
        s = pres.addSlide({ masterName: 'SlideFinal', sectionTitle: secao });
        const nome = NOME_RESPONSAVEL[sl.responsavel];
        // A imagem entra inteira e sem alteração (doc 02 §10); o lint confere o hash (E3).
        s.addImage({ path: join(o.marca, manifesto.slides_finais[sl.responsavel].arquivo), x: 0, y: 0, w: SLIDE.w, h: SLIDE.h, objectName: `slide final ${nome}`, altText: `Slide final de contato — ${nome}` });
        break;
      }
      case 'contato': {
        s = pres.addSlide({ masterName: 'Capa', sectionTitle: secao });
        s.addText('VAMOS CONVERSAR', { placeholder: 'title' });
        s.addText('Matriz Curitiba (41) 3319.0371 · Filial São Paulo (11) 93416.7871', { placeholder: 'body' });
        s.addText('brain.srv.br | contato@brain.srv.br', { placeholder: 'rodape' });
        break;
      }
    }
    s.addNotes(sl.notas);
  }
  await pres.writeFile({ fileName: o.saida });
  await applyTheme(o.saida, TEMA);
  return { slides: spec.slides.length, arquivo: o.saida };
}
