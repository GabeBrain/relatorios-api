"""lint_pptx.py: a referência aprovada passa com zero 🔒 e cada fixture com um defeito reprova na regra certa.

Cada fixture parte do deck de referência construído pela brain-deck e injeta UM defeito com python-pptx.
"""

from __future__ import annotations

import io
import re
import tempfile
import unittest
from pathlib import Path

from apoio import LIB, Ambiente, exigir_ou_pular, pasta_fontes
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, PP_PLACEHOLDER
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.util import Inches

import lint_pptx as L

def ids(r: dict, nivel: str = "FALHA") -> set[str]:
    return {i["id"] for i in r["itens"] if i["nivel"] == nivel}


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.amb = Ambiente.obter()
        cls.tmp = Path(tempfile.mkdtemp(prefix="lint-"))

    def lint(self, caminho: Path | None = None, **kw) -> dict:
        kw.setdefault("marca", self.amb.marca)
        kw.setdefault("dir_fontes", pasta_fontes())
        kw.setdefault("responsavel", "fabio")
        return L.lint(caminho or self.amb.referencia, **kw)

    def mutar(self, fn, nome: str) -> Path:
        prs = Presentation(str(self.amb.referencia))
        fn(prs)
        destino = self.tmp / f"{nome}.pptx"
        prs.save(str(destino))
        return destino

    def caixa(self, slide, texto: str, w=4.0, h=0.6, x=1.0, y=6.2, ajustar=False):
        tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tb.text_frame.text = texto
        tb.text_frame.word_wrap = True
        tb.text_frame.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT if ajustar else MSO_AUTO_SIZE.NONE
        return tb

    def assertSoFalha(self, r: dict, regra: str):
        self.assertEqual(ids(r), {regra}, [i for i in r["itens"] if i["nivel"] == "FALHA"])


class Referencia(Base):
    def test_referencia_zero_falhas(self):
        r = self.lint()
        self.assertEqual(r["slides"], 18)
        self.assertEqual(r["falhas_bloqueantes"], 0, [i for i in r["itens"] if i["nivel"] == "FALHA"])

    def test_referencia_com_briefing_completo_tambem_passa(self):
        briefing = {"responsavel": "fabio", "palestrante": "Fábio Tadeu Araújo",
                    "cargo": "CEO · Brain Inteligência Estratégica", "data": "2026-11-20", "tempo_fala_min": 15}
        r = self.lint(briefing=briefing)
        self.assertEqual(r["falhas_bloqueantes"], 0, r["itens"])
        self.assertNotIn("E1", {n["id"] for n in r["nao_verificado"]})

    def test_T8_deficit_e_superavit_nao_sao_erro_de_ortografia(self):
        # A referência fala de "déficit habitacional"; o dicionário pt_BR do Debian não traz a palavra.
        r = self.lint()
        if "T8" in {n["id"] for n in r["nao_verificado"]}:
            self.skipTest("hunspell pt_BR indisponível")
        t8 = " ".join(i["mensagem"] for i in r["itens"] if i["id"] == "T8")
        self.assertNotRegex(t8.lower(), r"d[eé]ficit|super[aá]vit")

    def test_o_que_nao_foi_verificado_e_declarado(self):
        r = self.lint(briefing=None, fontes_json=None)
        pulados = {n["id"] for n in r["nao_verificado"]}
        self.assertTrue({"D2", "E1", "F1"} <= pulados)


class FalhasDeMarca(Base):
    def test_M1_fonte_fora_da_marca(self):
        def f(prs):
            titulo = next(sh for sh in prs.slides[3].placeholders if sh.placeholder_format.type == PP_PLACEHOLDER.TITLE)
            titulo.text_frame.paragraphs[0].runs[0].font.name = "Arial"
        # Fonte desconhecida é medida como Montserrat (mais larga): o título também pode acusar T1.
        r = self.lint(self.mutar(f, "m1"))
        self.assertIn("M1", ids(r))
        self.assertLessEqual(ids(r), {"M1", "T1"})

    def test_M2_cor_fora_da_paleta(self):
        def f(prs):
            sh = prs.slides[1].shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(6.4), Inches(1), Inches(0.3))
            sh.fill.solid()
            sh.fill.fore_color.rgb = RGBColor(0xFF, 0x00, 0x00)
            sh.line.fill.background()
        r = self.lint(self.mutar(f, "m2"))
        self.assertIn("M2", ids(r))
        self.assertTrue(any("#FF0000" in i["mensagem"] for i in r["itens"]))

    def test_M2_cor_extra_aprovada_no_briefing_passa(self):
        def f(prs):
            sh = prs.slides[1].shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.6), Inches(6.4), Inches(1), Inches(0.3))
            sh.fill.solid()
            sh.fill.fore_color.rgb = RGBColor(0xE3, 0x00, 0x13)
            sh.line.fill.background()
        r = self.lint(self.mutar(f, "m2extra"), briefing={"cores_extra_aprovadas": ["E30013"]})
        self.assertNotIn("M2", ids(r))

    def test_M3_circulo_decorativo(self):
        self.assertSoFalha(self.lint(self.mutar(
            lambda prs: prs.slides[1].shapes.add_shape(MSO_SHAPE.OVAL, Inches(11), Inches(0.3), Inches(1), Inches(1)), "m3")), "M3")

    def test_M4_logo_em_texto(self):
        self.assertSoFalha(self.lint(self.mutar(lambda prs: self.caixa(prs.slides[1], "BRAIN", w=2, h=0.5, x=10.5, y=0.3), "m4")), "M4")

    def test_M5_logo_com_tagline_pequena(self):
        logo = self.amb.marca / "derivados" / "logo_tag.png"
        prop = Image.open(logo).width / Image.open(logo).height
        self.assertSoFalha(self.lint(self.mutar(
            lambda prs: prs.slides[1].shapes.add_picture(str(logo), Inches(10.5), Inches(0.3), Inches(1.0), Inches(1.0 / prop)), "m5")), "M5")

    def test_M6_logo_distorcida(self):
        logo = self.amb.marca / "derivados" / "logo_sem.png"
        self.assertSoFalha(self.lint(self.mutar(
            lambda prs: prs.slides[1].shapes.add_picture(str(logo), Inches(10.5), Inches(0.3), Inches(1.6), Inches(1.0)), "m6a")), "M6")

    def test_M6_logo_positiva_sobre_fundo_verde(self):
        logo = self.amb.marca / "derivados" / "logo_sem.png"
        prop = Image.open(logo).width / Image.open(logo).height
        # slide 3 é divisor: fundo verde do layout
        r = self.lint(self.mutar(
            lambda prs: prs.slides[2].shapes.add_picture(str(logo), Inches(0.8), Inches(0.5), Inches(1.5), Inches(1.5 / prop)), "m6b"))
        self.assertSoFalha(r, "M6")
        self.assertTrue(any("fundo escuro" in i["mensagem"] for i in r["itens"]))


class FalhasDeTexto(Base):
    def test_T1_texto_transbordando(self):
        exigir_ou_pular(self, pasta_fontes() is not None, "fontes da marca indisponíveis (SLIDE_MAKER_FONTES)")
        longo = "Os números indicam que o vazio brasileiro é local e precisa de leitura na zona de influência. " * 3
        self.assertSoFalha(self.lint(self.mutar(lambda prs: self.caixa(prs.slides[1], longo, w=4, h=0.5, y=6.3), "t1")), "T1")

    def test_T1_caixa_que_cresce_so_reprova_se_passar_do_slide(self):
        exigir_ou_pular(self, pasta_fontes() is not None, "fontes da marca indisponíveis (SLIDE_MAKER_FONTES)")
        frase = "Os números indicam que o vazio brasileiro é local e precisa de leitura na zona de influência. "
        cabe = self.mutar(lambda prs: self.caixa(prs.slides[1], frase * 2, w=6, h=0.4, y=5.4, ajustar=True), "t1cresce")
        self.assertNotIn("T1", ids(self.lint(cabe)))
        passa = self.mutar(lambda prs: self.caixa(prs.slides[1], frase * 6, w=6, h=0.4, y=6.3, ajustar=True), "t1passa")
        self.assertSoFalha(self.lint(passa), "T1")

    def test_T1_caixa_folgada_nao_reprova(self):
        exigir_ou_pular(self, pasta_fontes() is not None, "fontes da marca indisponíveis (SLIDE_MAKER_FONTES)")
        r = self.lint(self.mutar(lambda prs: self.caixa(prs.slides[1], "Os números indicam folga.", w=5, h=0.6, y=6.3), "t1ok"))
        self.assertNotIn("T1", ids(r))

    def test_regras_de_redacao(self):
        casos = {
            "T4": "Configura uma boa oportunidade para o setor",
            "T5": "Fonte não confirmada pela equipe",
            "T6": "Nessa seção, temos que ver se atualizamos",
            "T7": "ESPAÇO PARA QRCODE",
            "T10": "Vc vai gostar deste dado",
        }
        for regra, frase in casos.items():
            with self.subTest(regra=regra):
                self.assertSoFalha(self.lint(self.mutar(lambda prs, fr=frase: self.caixa(prs.slides[1], fr, w=8), f"red_{regra}")), regra)

    def test_T6_TODO_em_maiusculas_mas_nao_a_palavra_todo(self):
        self.assertSoFalha(self.lint(self.mutar(lambda prs: self.caixa(prs.slides[1], "TODO incluir dado", w=6), "todo")), "T6")
        r = self.lint(self.mutar(lambda prs: self.caixa(prs.slides[1], "Vale para todo o país", w=6), "todo_ok"))
        self.assertNotIn("T6", ids(r))

    def test_T10_tambem_nas_notas_e_no_roteiro(self):
        def f(prs):
            tf = prs.slides[1].notes_slide.notes_text_frame
            tf.text = tf.text + " Eu acho que este número é alto."
        self.assertSoFalha(self.lint(self.mutar(f, "t10notas")), "T10")
        self.assertSoFalha(self.lint(roteiro="00:30 — Vou falar um pouquinho do Censo."), "T10")


class FalhasDeDadosEEntrega(Base):
    def test_D1_numero_sem_fonte(self):
        def f(prs):
            for sh in list(prs.slides[3].shapes):
                if sh.has_text_frame and sh.text_frame.text.startswith("Fonte"):
                    sh._element.getparent().remove(sh._element)
        r = self.lint(self.mutar(f, "d1"))
        self.assertSoFalha(r, "D1")
        self.assertEqual({i["slide"] for i in r["itens"] if i["id"] == "D1"}, {4})

    def test_E1_capa_diferente_do_briefing(self):
        r = self.lint(briefing={"responsavel": "fabio", "evento_nome_oficial": "ADIT Cidades 2026", "cidade": "Florianópolis",
                                "palestrante": "Fábio Tadeu Araújo", "data": "2026-11-20"})
        self.assertSoFalha(r, "E1")
        msgs = " ".join(i["mensagem"] for i in r["itens"] if i["id"] == "E1")
        self.assertIn("ADIT", msgs)
        self.assertIn("Florianópolis", msgs)
        self.assertNotIn("Fábio", msgs)

    def test_E1_data_do_evento(self):
        r = self.lint(briefing={"responsavel": "fabio", "palestrante": "Fábio Tadeu Araújo", "data": "2027-03-10"})
        self.assertSoFalha(r, "E1")

    def test_E2_qr_previsto_e_ausente(self):
        briefing = {"responsavel": "fabio", "entregaveis": {"qr_code_url": "https://brain.srv.br/estudo"}}
        self.assertSoFalha(self.lint(briefing=briefing), "E2")
        qr = self.tmp / "qr.png"
        im = Image.new("RGB", (210, 210), "white")
        for x in range(0, 210, 30):
            for y in range(0, 210, 30):
                if (x // 30 + y // 30) % 2:
                    im.paste((0, 0, 0), (x, y, x + 30, y + 30))
        im.save(qr)
        com_qr = self.mutar(lambda prs: prs.slides[1].shapes.add_picture(str(qr), Inches(11), Inches(5.3), Inches(1.2), Inches(1.2)), "e2ok")
        self.assertNotIn("E2", ids(self.lint(com_qr, briefing=briefing)))

    def test_E3_responsavel_diferente(self):
        self.assertSoFalha(self.lint(responsavel="guilherme"), "E3")
        self.assertSoFalha(self.lint(briefing={"responsavel": "finoti"}), "E3")

    def test_E3_sem_slide_final(self):
        def f(prs):
            lista = prs.slides._sldIdLst
            lista.remove(lista[-1])
        self.assertIn("E3", ids(self.lint(self.mutar(f, "e3sem"))))

    def test_E3_mesma_imagem_regravada_passa_mas_imagem_alterada_reprova(self):
        def trocar(prs, alterar: bool):
            s = prs.slides[-1]
            pic = next(sh for sh in s.shapes if sh.shape_type == 13)
            parte = s.part.related_part(pic._element.blipFill.blip.rEmbed)
            im = Image.open(io.BytesIO(parte.blob)).convert("RGB")
            if alterar:
                im.putpixel((5, 5), (255, 0, 0))
            buf = io.BytesIO()
            im.save(buf, "PNG", compress_level=1)
            parte._blob = buf.getvalue()
        self.assertNotIn("E3", ids(self.lint(self.mutar(lambda p: trocar(p, False), "e3regravada"))))
        self.assertSoFalha(self.lint(self.mutar(lambda p: trocar(p, True), "e3alterada")), "E3")

    def test_V1_valor_em_versao_sem_valores(self):
        deck = self.mutar(lambda prs: self.caixa(prs.slides[15], "Programa de R$ 1 bilhão", w=5), "v1")
        self.assertSoFalha(self.lint(deck, sem_valores=True), "V1")
        self.assertNotIn("V1", ids(self.lint(deck)))

    def test_F3_slide_vazio(self):
        def f(prs):
            prs.slides.add_slide(prs.slide_layouts.get_by_name("SlideFinal"))
            lista = prs.slides._sldIdLst
            novo = lista[-1]
            lista.remove(novo)
            lista.insert(5, novo)
        self.assertSoFalha(self.lint(self.mutar(f, "f3")), "F3")


class Alertas(Base):
    def test_alertas_nao_bloqueiam(self):
        def f(prs):
            s = prs.slides[1]
            sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(12.3), Inches(0.3), Inches(0.4), Inches(0.4))
            sh.fill.solid()
            sh.fill.fore_color.rgb = RGBColor(0x1F, 0x5F, 0x8A)  # azul: terceira família no slide
            tb = self.caixa(s, "Leitura de mercado", w=4)
            tb.text_frame.paragraphs[0].runs[0].font.name = "Neo Sans Pro"
            prs.slides[4].notes_slide.notes_text_frame.text = ""
        r = self.lint(self.mutar(f, "alertas"))
        self.assertEqual(r["falhas_bloqueantes"], 0, r["itens"])
        self.assertTrue({"M7", "M8", "F4"} <= ids(r, "ALERTA"))

    def test_D2_e_D4_com_fontes_json(self):
        fontes = [{"indicador": "domicílios vagos 2022", "valor": "11,4 mi"}, {"indicador": "taxa de vacância 2022", "valor": "12,6%"},
                  {"indicador": "taxa de vacância 2022", "valor": "12,7%"}]
        r = self.lint(fontes_json=fontes, relatorio="# Relatório\n## Números derivados\n- 87% (variação calculada)\n")
        alertas = [i for i in r["itens"] if i["nivel"] == "ALERTA"]
        d2 = [i for i in alertas if i["id"] == "D2"]
        self.assertTrue(d2, "D2 deveria apontar números ausentes de fontes.json")
        self.assertFalse(any(re.search(r"\b11,4\b", i["mensagem"]) for i in d2 if i["slide"] == 2))
        self.assertTrue(any("12,7%" in i["mensagem"] for i in alertas if i["id"] == "D4"))
        self.assertEqual(r["falhas_bloqueantes"], 0)

    def test_D4_mesmo_indicador_com_grafias_diferentes(self):
        r = self.lint(self.mutar(lambda prs: self.caixa(prs.slides[12], "São Paulo tem ~588 mil vagos", w=5), "d4"))
        self.assertIn("D4", ids(r, "ALERTA"))

    def test_D5_fonte_antiga_sem_etiqueta(self):
        r = self.lint(briefing={"responsavel": "fabio", "data": "2026-11-20"})
        self.assertIn("D5", ids(r, "ALERTA"))


class Consistencia(unittest.TestCase):
    def test_paleta_igual_a_da_brain_deck(self):
        tema = (LIB / "brain-deck" / "tema.js").read_text(encoding="utf-8")
        cores = dict(re.findall(r"hex: '([0-9A-F]{6})'.*?familia: '(\w+)'", tema))
        self.assertEqual(cores, L.PALETA)


if __name__ == "__main__":
    unittest.main()
