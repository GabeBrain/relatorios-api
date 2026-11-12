// REFERÊNCIA — build aprovado do teste "Domicílios vagos v3" (nov/2026).
// Modelo para a lib/brain-deck (INSTRUCOES_DESENVOLVIMENTO.md §6.4). NÃO RODA ISOLADO:
//  - requer lib/apply_theme.js (a implementar: grava THEME.colors e o nome do tema em ppt/theme/theme1.xml após writeFile);
//  - requer ./marca/ com logo_tag.png, logo_sem.png, logo_branco_tag.png, logo_branco_sem.png (logos oficiais já
//    recortadas da margem do canvas) e final_fabio.png (slide final do consultor), ver §6.1;
//  - requer as fontes Neo Sans Pro e Montserrat instaladas para renderizar fielmente.
// Neo Sans em números de destaque é intencional (doc 02 §4, exceção de 12/11/2026).
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("../lib/apply_theme.js"); // implementar em gcp/apresentacoes-agent/lib/: grava THEME.colors e o nome do tema em ppt/theme/theme1.xml após writeFile
const D = require("./data_domicilios_v3.json");
const M = __dirname + "/marca/"; // logos e slide final: ver seção 6.1 das instruções

// Paleta do Manual de Marca Brain (doc 02 §3)
const THEME = {
  name: "Brain",
  headFontFace: "Neo Sans Pro",
  bodyFontFace: "Montserrat",
  colors: {
    dk1: "58595B", lt1: "FFFFFF", dk2: "5B7537", lt2: "F2F2F2",
    accent1: "5B7537", accent2: "FFD500", accent3: "BCBEC0",
    accent4: "2E3525", accent5: "7CA83E", accent6: "1F5F8A",
    hlink: "5B7537", folHlink: "2E3525",
  },
};
const HEX = { green: "5B7537", dgreen: "2E3525", lgreen: "7CA83E", yellow: "FFD500", grey: "BCBEC0", lgrey: "F2F2F2", text: "58595B" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Brain Inteligência Estratégica";
pres.company = "Brain Inteligência Estratégica";
pres.title = "O Brasil dos domicílios vazios";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const F_CENSO = "Fonte: IBGE, Censo Demográfico 2010 (SIDRA 1310) e 2022 (SIDRA 4711) · Elaboração Brain";
const TAXA = " · Taxa de vacância = vagos ÷ domicílios particulares (2010) e particulares permanentes (2022)";

// Logo: rodapé SEM tagline (pequena); capa COM tagline (grande)
const LW = 1.2, LH = LW * 456 / 1689;
const logoRodape = (dark) => ({ image: { x: 13.333 - 0.6 - LW, y: 6.95, w: LW, h: LH, path: M + (dark ? "logo_branco_sem.png" : "logo_sem.png") } });

// Blocos modulares (manual p. 61–68): retângulo com um canto arredondado
const bloco = (x, y, w, h, color, rot = 0) => ({ rect: { x, y, w, h, fill: { color }, line: { type: "none" }, rectRadius: 0, rotate: rot } });

pres.defineSlideMaster({
  title: "Capa",
  background: { color: C.accent1 },
  objects: [
    { image: { x: 0.8, y: 0.8, w: 3.2, h: 3.2 * 487 / 1568, path: M + "logo_branco_tag.png" } },
    { placeholder: { options: { name: "title", type: "title", align: "left", x: 0.8, y: 2.3, w: 7.8, h: 2.2, fontFace: "Neo Sans Pro", fontSize: 46, bold: true, color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.7, w: 7.4, h: 1.0, fontSize: 18, color: C.background1, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "rodape", type: "body", x: 0.8, y: 6.3, w: 7, h: 0.6, fontSize: 13, color: C.accent2, bold: true, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "Divisor",
  background: { color: C.accent1 },
  objects: [
    { placeholder: { options: { name: "numero", type: "body", x: 0.8, y: 1.5, w: 4, h: 1.6, fontFace: "Neo Sans Pro", fontSize: 96, bold: true, color: C.accent2, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", align: "left", x: 0.8, y: 3.3, w: 8.5, h: 1.5, fontFace: "Neo Sans Pro", fontSize: 36, bold: true, color: C.background1, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.9, w: 8.5, h: 0.8, fontSize: 16, color: C.background1, valign: "top", margin: 0 }, text: "" } },
    logoRodape(true),
  ],
});
pres.defineSlideMaster({
  title: "Conteudo",
  background: { color: C.background1 },
  slideNumber: { x: 10.85, y: 6.98, w: 0.5, h: 0.3, fontFace: "Montserrat", fontSize: 10, color: "BCBEC0", align: "right" },
  objects: [
    { placeholder: { options: { name: "tag", type: "body", x: 0.6, y: 0.3, w: 10, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 1, margin: 0 }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", align: "left", x: 0.6, y: 0.62, w: 12.1, h: 0.6, fontFace: "Neo Sans Pro", fontSize: 30, bold: true, color: C.text2, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "apoio", type: "body", x: 0.6, y: 1.25, w: 12.1, h: 0.5, fontSize: 18, bold: true, color: C.text1, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "sub", type: "body", x: 0.6, y: 1.8, w: 12.1, h: 0.35, fontSize: 12, color: C.text1, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "fonte", type: "body", x: 0.6, y: 6.9, w: 10.0, h: 0.42, fontSize: 9, color: "58595B", valign: "middle", margin: 0 }, text: "" } },
    logoRodape(false),
  ],
});
pres.defineSlideMaster({ title: "SlideFinal", background: { color: C.background1 }, objects: [] });

// ---------- Helpers ----------
let cur = "", tagAtual = "";
function section(t, tag) { cur = t; tagAtual = tag; pres.addSection({ title: t }); }
function content({ title, apoio, sub, fonte, notes, tag }) {
  const s = pres.addSlide({ masterName: "Conteudo", sectionTitle: cur });
  s.addText(tag || tagAtual, { placeholder: "tag" });
  s.addText(title.toUpperCase(), { placeholder: "title" });
  if (apoio) s.addText(apoio, { placeholder: "apoio" });
  if (sub) s.addText(sub, { placeholder: "sub" });
  s.addText(fonte || F_CENSO, { placeholder: "fonte" });
  if (notes) s.addNotes(notes);
  return s;
}
function divisor(num, title, sub, notes) {
  const s = pres.addSlide({ masterName: "Divisor", sectionTitle: cur });
  s.addText(num, { placeholder: "numero" });
  s.addText(title.toUpperCase(), { placeholder: "title" });
  if (sub) s.addText(sub, { placeholder: "body" });
  // composição de blocos modulares (verde claro + amarelo) à direita
  s.addShape(pres.shapes.RECTANGLE, { x: 10.2, y: 0, w: 3.13, h: 3.2, fill: { color: C.accent2 }, line: { type: "none" }, objectName: "bloco modular 1" });
  s.addShape("round1Rect", { x: 10.2, y: 3.4, w: 3.13, h: 2.6, fill: { color: C.accent5 }, line: { type: "none" }, objectName: "bloco modular 2" });
  if (notes) s.addNotes(notes);
}
let n = 0;
const box = (s, x, y, w, h, color) => s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color }, line: { type: "none" }, objectName: `fundo ${++n}` });
const text = (s, t, o) => s.addText(t, { margin: 0, isTextBox: true, objectName: `texto ${++n}`, ...o });
function leitura(s, runs, x, y, w, h) {
  box(s, x, y, w, h, C.accent1);
  text(s, [{ text: "LEITURA BRAIN", options: { bold: true, fontSize: 11, color: C.accent2, charSpacing: 1, breakLine: true } }, { text: " ", options: { fontSize: 6, breakLine: true } }, ...runs],
    { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: h - 0.4, fontSize: 15, color: C.background1, valign: "middle", paraSpaceAfter: 4 });
}
const big = (t) => ({ text: t, options: { bold: true, fontSize: 24, color: C.accent2, fontFace: "Neo Sans Pro", breakLine: true } });
const br = () => ({ text: " ", options: { fontSize: 8, breakLine: true } });
function card(s, x, y, w, h, v, l, sub, hero) {
  box(s, x, y, w, h, hero ? C.accent1 : C.background2);
  text(s, v, { x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 1.1, fontFace: "Neo Sans Pro", fontSize: 50, bold: true, color: hero ? C.accent2 : C.accent1, valign: "bottom" });
  text(s, l, { x: x + 0.3, y: y + 1.45, w: w - 0.6, h: 0.75, fontSize: 15, bold: true, color: hero ? C.background1 : C.text1, valign: "top" });
  if (sub) text(s, sub, { x: x + 0.3, y: y + h - 0.6, w: w - 0.6, h: 0.4, fontSize: 12, color: hero ? C.background1 : C.text1 });
}
const axis = {
  catAxisLabelColor: "58595B", valAxisLabelColor: "58595B",
  catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", legendFontFace: "+mn-lt",
  catAxisLabelFontSize: 12, valAxisLabelFontSize: 10, dataLabelFontSize: 12, legendFontSize: 11,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, valAxisHidden: true,
  catAxisLineShow: true, catAxisLineColor: "BCBEC0", valAxisLineShow: false, valAxisLineColor: "BCBEC0", dataLabelColor: "58595B", showLegend: false,
};
const pct = '0.0"%"';
const shortName = (m) => m;

// =========================== SLIDES ===========================
section("Abertura", "ABERTURA");
{
  const s = pres.addSlide({ masterName: "Capa", sectionTitle: cur });
  s.addText("O BRASIL DOS DOMICÍLIOS VAZIOS", { placeholder: "title" });
  s.addText("O que os Censos 2010 e 2022 revelam sobre a vacância residencial e o que isso muda para o incorporador", { placeholder: "body" });
  s.addText([{ text: "Fábio Tadeu Araújo", options: { breakLine: true } }, { text: "CEO · Brain Inteligência Estratégica · novembro de 2026", options: { bold: false, color: C.background1 } }], { placeholder: "rodape" });
  s.addShape(pres.shapes.RECTANGLE, { x: 9.4, y: 0, w: 3.93, h: 3.75, fill: { color: C.accent2 }, line: { type: "none" }, objectName: "bloco modular 1" });
  s.addShape("round1Rect", { x: 9.4, y: 3.75, w: 3.93, h: 3.75, fill: { color: C.accent5 }, line: { type: "none" }, objectName: "bloco modular 2" });
  s.addShape("round1Rect", { x: 11.33, y: 1.75, w: 2.0, h: 2.0, fill: { color: C.accent1 }, line: { type: "none" }, rotate: 180, objectName: "bloco modular 3" });
  s.addNotes("Abertura (30s). Bom dia a todos. Nos próximos 15 minutos, mostramos o que o Censo revela sobre os domicílios vazios do Brasil e por que essa leitura precisa ser feita bairro a bairro.");
}
{
  const s = content({
    title: "11,4 milhões de domicílios vazios",
    apoio: "Um em cada oito domicílios está vago: quase dois para cada família em déficit",
    sub: "Domicílios particulares vagos (Censo 2022) e déficit habitacional (FJP, 2022)",
    fonte: "Fontes: IBGE, Censo 2010 e 2022; Fundação João Pinheiro, Déficit Habitacional no Brasil 2022 (divulgado em abr/2024) · Elaboração Brain",
    notes: "1min30. O Censo 2022 contou 11,4 milhões de domicílios vagos: 12,6% do estoque, contra 9,0% em 2010. No mesmo ano, a Fundação João Pinheiro estimou um déficit habitacional de cerca de 6,2 milhões de domicílios. São 1,8 domicílio vago para cada família em déficit. Tese da fala: o vazio cresceu em quase todo o país, mas é local, e é na zona de influência que ele vira risco ou oportunidade para o incorporador.",
  });
  card(s, 0.6, 2.35, 3.8, 2.75, "11,4 mi", "domicílios vagos em 2022", "6,1 mi em 2010 · +87%", true);
  card(s, 4.7, 2.35, 3.8, 2.75, "12,6%", "do estoque de domicílios está vago", "9,0% em 2010 · +3,6 pp");
  card(s, 8.8, 2.35, 3.9, 2.75, "6,2 mi", "domicílios em déficit habitacional", "FJP, 2022 · atualizado");
  text(s, [{ text: "Tese: ", options: { bold: true, color: C.accent1 } }, { text: "o vazio cresceu em quase todo o país, mas é local. É na zona de influência que ele vira risco ou oportunidade." }],
    { x: 0.6, y: 5.45, w: 12.1, h: 0.9, fontSize: 16, color: C.text1, valign: "middle" });
}

// ---------- BLOCO 1 ----------
section("1 · O vazio cresceu mais que o ocupado", "01 · O VAZIO CRESCEU MAIS QUE O OCUPADO");
divisor("01", "O vazio cresceu mais que o ocupado", "Ritmo, composição do novo estoque e comparação internacional", "Transição (15s). Começamos pelo ritmo.");
{
  const s = content({
    title: "O estoque cresceu 5 vezes mais que a população",
    apoio: "Os domicílios vagos cresceram 87%, enquanto a população cresceu 6,5%",
    sub: "Variação 2010–2022 — Brasil (%)",
    fonte: "Fontes: IBGE, Censo 2010 e 2022 (população: 203,1 mi em 2022; moradores por domicílio) · Elaboração Brain",
    notes: "1min15. A população cresceu 6,5% em 12 anos. Os domicílios ocupados, 26%. O estoque total, 34%. E os vagos, 87%. Parte da explicação está na família menor: a média caiu de 3,31 para 2,79 moradores por domicílio. Mas o estoque correu na frente da demanda. Atualizado com dados de população do IBGE.",
  });
  s.addChart(pres.charts.BAR, [{ name: "Variação", labels: ["População", "Domicílios ocupados", "Total de domicílios", "Domicílios vagos"], values: [6.5, 26.2, 34.2, 87.0] }], {
    x: 0.6, y: 2.3, w: 7.8, h: 4.4, barDir: "col", ...axis, chartColors: [HEX.grey, HEX.grey, HEX.grey, HEX.green],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '"+"0.0"%"', dataLabelFontSize: 16, dataLabelFontBold: true,
    valAxisMinVal: 0, valAxisMaxVal: 100, barGapWidthPct: 60, objectName: "grafico ritmo",
  });
  leitura(s, [big("3,31 → 2,79"), { text: "moradores por domicílio entre 2010 e 2022. Famílias menores explicam parte da expansão; o restante ficou vago." }], 8.8, 2.5, 3.9, 3.9);
}
{
  const s = content({
    title: "23 de cada 100 novos domicílios estão vagos",
    apoio: "Dos 23,1 milhões de domicílios acrescentados desde 2010, 5,3 milhões estão vazios",
    sub: "Composição do acréscimo de domicílios particulares — Brasil, 2010–2022",
    notes: "1min. Dos 23,1 milhões de domicílios acrescentados, 65 de cada 100 foram ocupados, 23 estão vagos e 12 são de uso ocasional. Ponto de atenção para o setor: uma parte relevante da expansão do estoque não virou moradia ocupada.",
  });
  s.addChart(pres.charts.BAR, [
    { name: "Ocupados", labels: ["Acréscimo"], values: [65.1] },
    { name: "Vagos", labels: ["Acréscimo"], values: [23.0] },
    { name: "Uso ocasional", labels: ["Acréscimo"], values: [11.9] },
  ], {
    x: 0.6, y: 2.35, w: 12.1, h: 1.6, barDir: "bar", barGrouping: "percentStacked", ...axis, catAxisHidden: true,
    chartColors: [HEX.green, HEX.yellow, HEX.grey], showValue: true, dataLabelPosition: "ctr", dataLabelFormatCode: "0",
    dataLabelFontSize: 18, dataLabelFontBold: true, dataLabelColor: "2E3525", barGapWidthPct: 10, objectName: "grafico composicao",
  });
  [["15,0 mi", "ocupados", "65 de cada 100 novos domicílios", HEX.green], ["5,3 mi", "vagos", "23 de cada 100 · de 6,1 mi para 11,4 mi", HEX.yellow], ["2,7 mi", "uso ocasional", "12 de cada 100 · de 3,9 mi para 6,7 mi", HEX.grey]].forEach((c, i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 4.35, w: 0.18, h: 0.18, fill: { color: c[3] }, line: { type: "none" }, objectName: `marcador ${i + 1}` });
    text(s, c[0], { x: x + 0.3, y: 4.2, w: 3.5, h: 0.75, fontFace: "Neo Sans Pro", fontSize: 36, bold: true, color: i === 0 ? C.accent1 : C.text1 });
    text(s, c[1], { x: x + 0.3, y: 5.0, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: C.text1 });
    text(s, c[2], { x: x + 0.3, y: 5.4, w: 3.6, h: 0.7, fontSize: 12, color: C.text1, valign: "top" });
  });
}
{
  const s = content({
    title: "Já estamos perto do Japão",
    apoio: "A vacância brasileira (12,6%) se aproxima do recorde japonês de 13,8%",
    sub: "Taxa de domicílios vagos (%) — Brasil (Censo) e Japão (pesquisa nacional de habitação, out/2023)",
    fonte: "Fontes: IBGE, Censo 2010 e 2022; Ministério de Assuntos Internos e Comunicações do Japão via Nippon.com · Definições nacionais de domicílio vago diferem",
    notes: "1min. Comparação internacional. O Japão, país que envelhece e encolhe, chegou ao recorde de 9 milhões de casas vazias em 2023: 13,8% do estoque, com um termo próprio para isso, 'akiya'. O Brasil, com população ainda crescendo, já está em 12,6%. As definições não são idênticas, então a comparação é de ordem de grandeza. O ponto é: o nosso vazio não vem de população encolhendo, vem de estoque mal localizado ou inadequado.",
  });
  s.addChart(pres.charts.BAR, [{ name: "Vacância", labels: ["Brasil 2010", "Brasil 2022", "Japão 2023"], values: [9.0, 12.6, 13.8] }], {
    x: 0.6, y: 2.3, w: 7.8, h: 4.4, barDir: "col", ...axis, chartColors: [HEX.grey, HEX.green, HEX.dgreen],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: pct, dataLabelFontSize: 18, dataLabelFontBold: true,
    valAxisMinVal: 0, valAxisMaxVal: 16, barGapWidthPct: 70, objectName: "grafico internacional",
  });
  leitura(s, [big("9 milhões"), { text: "de casas vazias no Japão, um país que encolhe. O Brasil chega a taxa parecida com a população ainda crescendo: o vazio aqui é de localização e de produto." }], 8.8, 2.5, 3.9, 3.9);
}

// ---------- BLOCO 2 ----------
section("2 · A vacância tem geografia", "02 · A VACÂNCIA TEM GEOGRAFIA");
divisor("02", "A vacância tem geografia", "Regiões e Unidades da Federação", "Transição (15s). O fenômeno é nacional; a intensidade, não.");
{
  const s = content({
    title: "Nordeste lidera, Sul tem a menor taxa",
    apoio: "Todas as regiões subiram entre 2,7 e 4,1 pontos percentuais em 12 anos",
    sub: "Taxa de vacância por grande região — 2010 × 2022 (%)",
    fonte: F_CENSO + TAXA,
    notes: "1min. O Nordeste chega a 15,0%; o Sul fica em 10,5%. Em volume, o Sudeste concentra 4,6 milhões de vagos, 40% do total nacional. Taxa e volume contam histórias diferentes, e o incorporador precisa olhar os dois.",
  });
  s.addChart(pres.charts.BAR, [{ name: "2010", labels: D.reg.cat, values: D.reg.v10 }, { name: "2022", labels: D.reg.cat, values: D.reg.v22 }], {
    x: 0.6, y: 2.3, w: 7.9, h: 4.4, barDir: "col", ...axis, chartColors: [HEX.grey, HEX.green], showValue: true,
    dataLabelPosition: "outEnd", dataLabelFormatCode: pct, showLegend: true, legendPos: "t", valAxisMinVal: 0, barGapWidthPct: 50, objectName: "grafico regioes",
  });
  leitura(s, [big("4,6 mi"), { text: "de vagos estão no Sudeste: 40% do total nacional, com a segunda menor taxa do país." }], 8.9, 2.5, 3.8, 3.9);
}
{
  const s = content({
    title: "Santa Catarina é a exceção do país",
    apoio: "A menor vacância do Brasil (8,8%) e praticamente estável desde 2010",
    sub: "Taxa de vacância por UF — 2022 (%), em ordem crescente",
    fonte: F_CENSO + TAXA,
    notes: "1min15. Santa Catarina tem a menor taxa (8,8%) e quase não mudou desde 2010 (+0,6 pp). Roraima foi a única UF com queda. No outro extremo, Rondônia (16,7%) e Bahia (16,0%). Em volume, São Paulo soma 2,16 milhões de vagos, 19% do país. O Distrito Federal teve a segunda maior alta da taxa, +5,4 pp, atrás apenas de Rondônia.",
  });
  const colors = D.uf.cat.map((u) => (u === "SC" ? HEX.yellow : (u === "RO" || u === "BA") ? HEX.dgreen : HEX.green));
  s.addChart(pres.charts.BAR, [{ name: "2022", labels: D.uf.cat, values: D.uf.v22 }], {
    x: 0.6, y: 2.2, w: 12.1, h: 3.5, barDir: "col", ...axis, chartColors: colors, showValue: true, dataLabelPosition: "outEnd",
    dataLabelFormatCode: "0.0", dataLabelFontSize: 9, catAxisLabelFontSize: 10, valAxisMinVal: 0, barGapWidthPct: 35, objectName: "grafico UFs",
  });
  [["SC 8,8%", "menor taxa e quase estável (+0,6 pp)"], ["RR −0,5 pp", "única UF com queda da taxa"], ["SP 2,16 mi", "de vagos: 19% do total do país"]].forEach((f, i) => {
    const x = 0.6 + i * 4.1;
    box(s, x, 5.85, 3.8, 0.85, C.background2);
    text(s, [{ text: f[0] + "  ", options: { bold: true, color: C.accent1, fontSize: 16 } }, { text: f[1], options: { fontSize: 12, color: C.text1 } }], { x: x + 0.2, y: 5.85, w: 3.45, h: 0.85, valign: "middle" });
  });
}

// ---------- BLOCO 3 ----------
section("3 · Capitais e grandes cidades", "03 · CAPITAIS E GRANDES CIDADES");
divisor("03", "Nas grandes cidades, o vazio acelerou", "Capitais e municípios por porte", "Transição (15s). Agora, onde o incorporador mais atua.");
{
  const s = content({
    title: "Capitais vão de 7% a 18%",
    apoio: "Boa Vista tem 7,1% de domicílios vagos; Porto Velho, 17,8%",
    sub: "Taxa de vacância das capitais — 2022 (%), da maior para a menor",
    fonte: F_CENSO + TAXA,
    notes: "1min15. Mais de 10 pontos de amplitude entre capitais. Boa Vista, Florianópolis e Vitória ficam abaixo de 10%; Curitiba e Belo Horizonte, logo acima. No topo, Porto Velho, Salvador, João Pessoa e Natal. Boa Vista e Florianópolis foram as únicas capitais que reduziram a taxa desde 2010.",
  });
  const colors = D.cap.cat.map((c) => (["Boa Vista", "Florianópolis"].includes(c) ? HEX.yellow : HEX.green));
  s.addChart(pres.charts.BAR, [{ name: "2022", labels: D.cap.cat, values: D.cap.v22 }], {
    x: 0.6, y: 2.15, w: 8.3, h: 4.65, barDir: "bar", ...axis, chartColors: colors, showValue: true, dataLabelPosition: "outEnd",
    dataLabelFormatCode: "0.0", dataLabelFontSize: 9, catAxisLabelFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: 21, barGapWidthPct: 30, objectName: "grafico capitais",
  });
  leitura(s, [big("2 de 27"), { text: "capitais reduziram a taxa: Boa Vista (9,7% → 7,1%) e Florianópolis (11,1% → 9,8%). As outras 25 subiram." }], 9.2, 2.5, 3.5, 3.9);
}
{
  const s = content({
    title: "Capitais dobraram o estoque vago",
    apoio: "De 1,27 para 2,61 milhões de vagos: +105%, acima do ritmo nacional (+87%)",
    sub: "Domicílios vagos nas 27 capitais — 2010 × 2022",
    notes: "1min. As capitais concentram hoje 23% dos vagos do país. Só São Paulo tem 589 mil domicílios vagos; o Rio, 388 mil. Fortaleza (+172%) e Salvador (+155%) estão entre as maiores altas. Para o incorporador, esse estoque disputa o mesmo comprador e o mesmo locatário do lançamento.",
  });
  box(s, 0.6, 2.35, 5.4, 4.3, C.accent1);
  text(s, "2,61 mi", { x: 0.9, y: 2.5, w: 4.9, h: 1.1, fontFace: "Neo Sans Pro", fontSize: 54, bold: true, color: C.accent2, valign: "bottom" });
  text(s, "domicílios vagos nas capitais em 2022 (1,27 mi em 2010)", { x: 0.9, y: 3.65, w: 4.9, h: 0.7, fontSize: 14, color: C.background1, valign: "top" });
  text(s, [
    { text: "+105%", options: { bold: true, fontSize: 30, color: C.background1, fontFace: "Neo Sans Pro" } }, { text: "   capitais", options: { fontSize: 13, color: C.background1, breakLine: true } },
    { text: "+87%", options: { bold: true, fontSize: 30, color: C.background1, fontFace: "Neo Sans Pro" } }, { text: "   Brasil", options: { fontSize: 13, color: C.background1, breakLine: true } },
    { text: "23% dos vagos do país estão nas capitais", options: { fontSize: 13, color: C.accent2, bold: true } },
  ], { x: 0.9, y: 4.45, w: 4.9, h: 2.0, valign: "top", paraSpaceAfter: 4 });
  const H = { bold: true, color: "FFFFFF", fill: { color: HEX.dgreen }, fontSize: 12 };
  const rows = [
    [{ text: "Capital", options: H }, { text: "Vagos 2010", options: { ...H, align: "right" } }, { text: "Vagos 2022", options: { ...H, align: "right" } }, { text: "Variação", options: { ...H, align: "right" } }],
    ...[["São Paulo", "293,6 mil", "589,0 mil", "+101%"], ["Rio de Janeiro", "193,7 mil", "388,3 mil", "+101%"], ["Salvador", "77,9 mil", "199,0 mil", "+155%"], ["Brasília", "63,0 mil", "148,9 mil", "+136%"], ["Fortaleza", "53,3 mil", "145,3 mil", "+172%"]]
      .map((r, i) => r.map((c, j) => ({ text: c, options: { fontSize: 13, color: "58595B", align: j ? "right" : "left", bold: j === 3, fill: { color: i % 2 ? HEX.lgrey : "FFFFFF" } } }))),
  ];
  text(s, "Maiores estoques vagos entre as capitais", { x: 6.4, y: 2.35, w: 6.3, h: 0.4, fontSize: 14, bold: true, color: C.text1 });
  s.addTable(rows, { x: 6.4, y: 2.85, w: 6.3, colW: [2.1, 1.4, 1.4, 1.4], rowH: 0.52, border: { type: "solid", pt: 0.5, color: "BCBEC0" }, fontFace: "Montserrat", valign: "middle", objectName: "tabela capitais" });
}
{
  const s = content({
    title: "A grande cidade perdeu o estoque enxuto",
    apoio: "Nos 17 maiores municípios, a vacância subiu 4,9 pontos em 12 anos",
    sub: "Taxa de vacância por porte do município (nº de domicílios particulares permanentes em 2022) — %",
    fonte: F_CENSO + TAXA,
    notes: "1min. Em 2010 havia uma escada: quanto maior a cidade, menor a vacância. 11,4% nos municípios com até 5 mil domicílios contra 7,7% nos 17 maiores. Em 2022 a diferença caiu para 0,8 ponto. O salto foi maior justamente nas cidades com mais de 400 mil domicílios.",
  });
  const labels = ["Até 5 mil", "5 a 20 mil", "20 a 100 mil", "100 a 400 mil", "Mais de 400 mil"];
  s.addChart(pres.charts.BAR, [{ name: "2010", labels, values: D.porte.v10 }, { name: "2022", labels, values: D.porte.v22 }], {
    x: 0.6, y: 2.3, w: 8.2, h: 4.4, barDir: "col", ...axis, chartColors: [HEX.grey, HEX.green], showValue: true,
    dataLabelPosition: "outEnd", dataLabelFormatCode: pct, showLegend: true, legendPos: "t", valAxisMinVal: 0, barGapWidthPct: 50, objectName: "grafico porte",
  });
  leitura(s, [big("3,7 → 0,8 pp"), { text: "foi a redução da diferença entre os menores e os 17 maiores municípios. Escala urbana deixou de ser garantia de estoque enxuto." }], 9.1, 2.5, 3.6, 3.9);
}
{
  const s = content({
    title: "Mesmo estado, realidades opostas",
    apoio: "No Rio de Janeiro, São João de Meriti tem 4,3% de vagos; Macaé, 18,4%",
    sub: `As 5 menores e as 5 maiores taxas de vacância em 2022 — ${D.nbig} municípios com mais de 100 mil domicílios (%)`,
    fonte: F_CENSO + TAXA,
    notes: "1min. Entre as 134 maiores cidades, a taxa vai de 4,3% em São João de Meriti a 19,6% em Camaçari. E o contraste aparece dentro do mesmo estado. A média nacional não serve de régua para decidir onde e o que lançar.",
  });
  const opts = (x, color, name) => ({
    x, y: 2.75, w: 5.9, h: 3.95, barDir: "bar", ...axis, chartColors: [color], showValue: true, dataLabelPosition: "outEnd",
    dataLabelFormatCode: pct, dataLabelFontSize: 12, catAxisLabelFontSize: 12, catAxisOrientation: "maxMin",
    valAxisMinVal: 0, valAxisMaxVal: 24, barGapWidthPct: 40, objectName: name,
  });
  text(s, "Menor vacância", { x: 0.6, y: 2.3, w: 5.9, h: 0.4, fontSize: 15, bold: true, color: C.accent1 });
  text(s, "Maior vacância", { x: 6.8, y: 2.3, w: 5.9, h: 0.4, fontSize: 15, bold: true, color: C.text1 });
  s.addChart(pres.charts.BAR, [{ name: "2022", labels: D.low.cat, values: D.low.v }], opts(0.6, HEX.green, "grafico menores"));
  s.addChart(pres.charts.BAR, [{ name: "2022", labels: D.high.cat.slice().reverse(), values: D.high.v.slice().reverse() }], opts(6.8, HEX.dgreen, "grafico maiores"));
}

// ---------- BLOCO 4 ----------
section("4 · O que fazer com o vazio", "04 · O QUE FAZER COM O VAZIO");
divisor("04", "O que fazer com o vazio", "Déficit, reocupação e implicações para o incorporador", "Transição (15s). Fechando: o que fazer com esse estoque.");
{
  const s = content({
    title: "Vazio e déficit convivem",
    apoio: "Metade do déficit é aluguel caro demais; o centro de SP mostra um caminho",
    sub: "Déficit habitacional 2022 (FJP) e resultados do Requalifica Centro + Subvenção Econômica (São Paulo, ago/2026)",
    fonte: "Fontes: FJP, Déficit Habitacional 2022 (abr/2024) via IRIB; Prefeitura de São Paulo (ago/2026) · Atualizado em nov/2026",
    notes: "1min30. Do déficit de 6,2 milhões, 52% é ônus excessivo com aluguel: 3,2 milhões de famílias que têm onde morar, mas pagam caro demais. Ou seja, o problema não é só falta de unidade, é unidade no lugar e no preço errados. Em São Paulo, o Requalifica Centro e a Subvenção Econômica já somam 50 edifícios em requalificação e 5.238 moradias, com 15 obras concluídas; a prefeitura subsidia até 25% da obra, num programa de R$ 1 bilhão.",
  });
  card(s, 0.6, 2.35, 3.8, 2.6, "52%", "do déficit é ônus excessivo com aluguel", "3,2 mi de famílias · FJP 2022", true);
  box(s, 4.7, 2.35, 8.0, 2.6, C.background2);
  text(s, "Requalifica Centro + Subvenção Econômica · São Paulo", { x: 5.0, y: 2.5, w: 7.4, h: 0.45, fontSize: 15, bold: true, color: C.accent1 });
  [["50", "edifícios em requalificação"], ["5.238", "moradias nos projetos"], ["15", "obras concluídas"]].forEach((k, i) => {
    const x = 5.0 + i * 2.5;
    text(s, k[0], { x, y: 3.05, w: 2.3, h: 0.9, fontFace: "Neo Sans Pro", fontSize: 40, bold: true, color: C.accent1, valign: "bottom" });
    text(s, k[1], { x, y: 4.0, w: 2.3, h: 0.7, fontSize: 13, color: C.text1, valign: "top" });
  });
  leitura(s, [{ text: "O déficit é tanto de preço e localização quanto de unidades. Reocupar estoque vago bem localizado, com subsídio a até 25% da obra, já virou programa de escala em São Paulo." }], 0.6, 5.2, 12.1, 1.45);
}
{
  const s = content({
    title: "Síntese Brain",
    apoio: "Três leituras para decisões de produto e localização",
    sub: "Implicações para o incorporador",
    fonte: F_CENSO + " · FJP 2022 · Prefeitura de SP (ago/2026) · Leitura Brain",
    notes: "2min. Implicação 1: a média de 12,6% não dimensiona o risco de um projeto. A taxa vai de 4,3% a 19,6% entre as grandes cidades; a leitura tem que ser feita na zona de influência. Implicação 2: os 2,6 milhões de vagos nas capitais são concorrentes do lançamento e também matéria-prima. Configura oportunidade de retrofit e locação, desde que localização e produto sejam requalificáveis. Implicação 3: onde a vacância é baixa, como em Santa Catarina, Florianópolis, Vitória, Curitiba e Belo Horizonte, os números indicam menor folga de estoque; cruzamos com oferta, lançamentos e VSO locais antes de decidir.",
  });
  const items = [
    ["1", "Leia o vazio na zona de influência", "De 4,3% a 19,6% entre as grandes cidades. A média nacional (12,6%) não dimensiona o risco de um projeto."],
    ["2", "Estoque vago é concorrente e matéria-prima", "2,6 mi de vagos nas capitais disputam o mesmo comprador e locatário. Configura oportunidade de retrofit e renda, desde que o ativo seja requalificável."],
    ["3", "Vacância baixa indica menor folga", "SC (8,8%), Florianópolis, Vitória, Curitiba e BH ficam abaixo da média. Cruzar com oferta, lançamentos e VSO locais."],
  ];
  items.forEach((it, i) => {
    const x = 0.6 + i * 4.1, y = 2.35, w = 3.8, h = 4.3;
    box(s, x, y, w, h, i === 1 ? C.accent1 : C.background2);
    const dark = i === 1;
    s.addShape("round1Rect", { x: x + 0.3, y: y + 0.3, w: 0.75, h: 0.75, fill: { color: dark ? C.accent2 : C.accent1 }, line: { type: "none" }, objectName: `bloco numero ${i + 1}` });
    text(s, it[0], { x: x + 0.3, y: y + 0.3, w: 0.75, h: 0.75, fontFace: "Neo Sans Pro", fontSize: 28, bold: true, color: dark ? C.accent1 : C.accent2, align: "center", valign: "middle" });
    text(s, it[1], { x: x + 0.3, y: y + 1.25, w: w - 0.6, h: 0.95, fontSize: 17, bold: true, color: dark ? C.accent2 : C.accent1, valign: "top" });
    text(s, it[2], { x: x + 0.3, y: y + 2.25, w: w - 0.6, h: 1.9, fontSize: 14, color: dark ? C.background1 : C.text1, valign: "top", lineSpacingMultiple: 1.15 });
  });
}
{
  const s = pres.addSlide({ masterName: "SlideFinal", sectionTitle: cur });
  s.addImage({ path: M + "final_fabio.png", x: 0, y: 0, w: 13.333, h: 7.5, objectName: "slide final Fábio Tadeu Araújo", altText: "Slide final de contato — Fábio Tadeu Araújo, CEO da Brain" });
  s.addNotes("30s. Obrigado. Os números indicam que o vazio brasileiro é local; estamos à disposição para ler a zona de influência de cada projeto. Os contatos estão na tela, e o QR code leva direto para nós.");
}

(async () => {
  const f = "Brain_Domicilios_Vagos_2010-2022_v3.pptx";
  await pres.writeFile({ fileName: f });
  await applyTheme(f, THEME);
  console.log("ok");
})();
