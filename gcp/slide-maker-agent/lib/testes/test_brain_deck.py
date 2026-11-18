"""brain-deck: reproduz o build aprovado da referência, aplica o tema e recusa specs inválidos."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

import os

from apoio import LIB, SERVICO, SPEC_REFERENCIA, Ambiente, exigir_ou_pular
from pptx import Presentation
from pptx.util import Emu

import lint_pptx as L

# No repositório: docs/…/referencia. No build da imagem: copiada para fora de /app (SLIDE_MAKER_REFERENCIA).
# O padrão só é calculado sem a variável: na imagem, SERVICO=/app não tem parents[1].
_REFERENCIA_ENV = os.environ.get("SLIDE_MAKER_REFERENCIA")
REFERENCIA = Path(_REFERENCIA_ENV) if _REFERENCIA_ENV else SERVICO.parents[1] / "docs" / "features" / "slide-maker" / "referencia"


def conteudo(caminho: Path) -> list:
    """Por slide: layout, notas e, por forma, (texto ou dados do gráfico/tabela, geometria)."""
    out = []
    for s in Presentation(str(caminho)).slides:
        formas = []
        for f in s.shapes:
            geo = tuple(round(Emu(v).inches, 1) for v in (f.left, f.top, f.width, f.height))
            if f.has_text_frame:
                formas.append(("texto", f.text_frame.text, geo))
            elif getattr(f, "has_chart", False) and f.has_chart:
                ch = f.chart
                formas.append(("grafico", str(ch.chart_type), [list(p.categories) for p in ch.plots],
                               [(sr.name, list(sr.values)) for p in ch.plots for sr in p.series], geo))
            elif getattr(f, "has_table", False) and f.has_table:
                formas.append(("tabela", [[c.text for c in r.cells] for r in f.table.rows], geo))
            else:
                formas.append((str(f.shape_type), geo))
        nota = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ""
        out.append((s.slide_layout.name, nota, formas))
    return out


class Referencia(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.amb = Ambiente.obter()
        cls.tmp = Path(tempfile.mkdtemp(prefix="brain-deck-"))

    def rodar_build_original(self) -> Path:
        """Roda referencia/build_domicilios_v3.js sem alterações, como o build aprovado rodou."""
        exigir_ou_pular(self, (REFERENCIA / "build_domicilios_v3.js").is_file(), f"referência não encontrada em {REFERENCIA}")
        pasta = self.tmp / "original"
        shutil.copytree(REFERENCIA, pasta / "referencia")
        (pasta / "referencia" / "marca").mkdir()
        der = self.amb.marca / "derivados"
        for n in ("logo_tag.png", "logo_sem.png", "logo_branco_tag.png", "logo_branco_sem.png"):
            shutil.copy(der / n, pasta / "referencia" / "marca" / n)
        shutil.copy(self.amb.marca / "slides-finais" / "fabio.png", pasta / "referencia" / "marca" / "final_fabio.png")
        (pasta / "lib").mkdir()
        alvo = (LIB / "apply_theme.js").as_uri()
        (pasta / "lib" / "apply_theme.js").write_text(
            f"exports.applyTheme = async (f, t) => (await import('{alvo}')).applyTheme(f, t);\n", encoding="utf-8")
        r = subprocess.run(["node", "build_domicilios_v3.js"], cwd=pasta / "referencia", capture_output=True, text=True,
                           env={**os.environ, "NODE_PATH": str(SERVICO / "node_modules")}, timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr)
        return pasta / "referencia" / "Brain_Domicilios_Vagos_2010-2022_v3.pptx"

    def test_reproduz_o_build_aprovado(self):
        original = conteudo(self.rodar_build_original())
        nosso = conteudo(self.amb.referencia)
        self.assertEqual(len(nosso), 18)
        self.assertEqual(len(original), 18)
        for i, (a, b) in enumerate(zip(nosso, original), 1):
            with self.subTest(slide=i):
                self.assertEqual(a[0], b[0], "layout")
                self.assertEqual(a[1], b[1], "notas")
                self.assertEqual(len(a[2]), len(b[2]), "número de formas")
                for fa, fb in zip(a[2], b[2]):
                    self.assertEqual(fa[:-1], fb[:-1])
                    # Única diferença aceita: a legenda do componente "numero" tem 0,1″ a menos de largura.
                    for va, vb in zip(fa[-1], fb[-1]):
                        self.assertAlmostEqual(va, vb, delta=0.11)

    def test_tema_brain_aplicado(self):
        with zipfile.ZipFile(self.amb.referencia) as z:
            tema = z.read("ppt/theme/theme1.xml").decode()
        self.assertIn('name="Brain"', tema)
        self.assertIn('<a:majorFont><a:latin typeface="Neo Sans Pro"', tema)
        self.assertIn('<a:minorFont><a:latin typeface="Montserrat"', tema)
        self.assertIn('<a:accent1><a:srgbClr val="5B7537"/>', tema)
        self.assertNotIn("Calibri", tema.split("<a:fontScheme")[1].split("</a:majorFont>")[0])

    def test_secoes_por_bloco(self):
        with zipfile.ZipFile(self.amb.referencia) as z:
            pres = z.read("ppt/presentation.xml").decode()
        for secao in ("Abertura", "1 · O vazio cresceu mais que o ocupado", "4 · O que fazer com o vazio"):
            self.assertIn(f'name="{secao}"', pres)


class Spec(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.amb = Ambiente.obter()
        cls.tmp = Path(tempfile.mkdtemp(prefix="brain-deck-spec-"))

    def build(self, spec: dict, cwd: Path | None = None) -> subprocess.CompletedProcess:
        arq = self.tmp / "spec.json"
        arq.write_text(json.dumps(spec, ensure_ascii=False), encoding="utf-8")
        return subprocess.run(["node", str(LIB / "brain-deck" / "build.js"), str(arq), str(self.tmp / "saida.pptx"), "--marca", str(self.amb.marca)],
                              capture_output=True, text=True, encoding="utf-8", cwd=cwd or self.tmp, timeout=120)

    def minimo(self, **extra) -> dict:
        return {"titulo": "Teste", "slides": [
            {"tipo": "capa", "titulo": "Capa", "palestrante": "Guilherme Werner", "notas": "n"},
            {"tipo": "conteudo", "titulo": "Um slide", "fonte": "Fonte: Brain", "notas": "n", "elementos": extra.get("elementos", [])},
            extra.get("final", {"tipo": "final", "responsavel": "guilherme", "notas": "n"}),
        ]}

    def test_spec_invalido_explica_o_campo(self):
        r = self.build({"titulo": "x", "slides": [{"tipo": "conteudo", "titulo": "t", "notas": "n", "elementos": [
            {"tipo": "bloco", "x": 1, "y": 1, "w": 1, "h": 1, "cor": "FF0000"}, {"tipo": "texto", "x": 1, "y": 1, "w": 1, "h": 1, "texto": "a", "fonte": "Arial"}]}]})
        self.assertEqual(r.returncode, 1)
        self.assertIn("deck_spec.json inválido", r.stderr)
        self.assertIn("FF0000", r.stderr)
        self.assertIn("fonte", r.stderr)
        self.assertIn("capa", r.stderr)
        self.assertIn("último slide", r.stderr)

    def test_imagem_fora_do_trabalho_e_recusada(self):
        r = self.build(self.minimo(elementos=[{"tipo": "imagem", "x": 1, "y": 2, "w": 2, "h": 2, "caminho": "../../etc/passwd"}]))
        self.assertEqual(r.returncode, 1)
        self.assertIn("fora do diretório do trabalho", r.stderr)

    def test_imagem_com_credito_e_slide_final_de_outro_consultor(self):
        (self.tmp / "trabalho" / "assets").mkdir(parents=True, exist_ok=True)
        shutil.copy(self.amb.marca / "slides-finais" / "finoti.png", self.tmp / "trabalho" / "assets" / "foto.png")
        r = self.build(self.minimo(elementos=[{"tipo": "imagem", "x": 1, "y": 2.3, "w": 4, "h": 2.25, "caminho": "trabalho/assets/foto.png", "credito": "Acervo Brain"}]))
        self.assertEqual(r.returncode, 0, r.stderr)
        res = L.lint(self.tmp / "saida.pptx", marca=self.amb.marca, responsavel="guilherme")
        self.assertEqual(res["falhas_bloqueantes"], 0, res["itens"])
        self.assertNotIn("F5", {i["id"] for i in res["itens"]})

    def test_responsavel_sem_slide_final_usa_contato(self):
        r = self.build(self.minimo(final={"tipo": "contato", "notas": "n"}))
        self.assertEqual(r.returncode, 0, r.stderr)
        res = L.lint(self.tmp / "saida.pptx", marca=self.amb.marca, responsavel="outro")
        self.assertNotIn("E3", {i["id"] for i in res["itens"] if i["nivel"] == "FALHA"})

    def test_cor_extra_aprovada(self):
        spec = self.minimo(elementos=[{"tipo": "bloco", "x": 1, "y": 2.3, "w": 1, "h": 1, "cor": "E30013"}])
        self.assertEqual(self.build(spec).returncode, 1)
        spec["cores_extra_aprovadas"] = ["E30013"]
        self.assertEqual(self.build(spec).returncode, 0)

    def test_exemplo_e_o_spec_da_referencia(self):
        spec = json.loads(SPEC_REFERENCIA.read_text(encoding="utf-8"))
        self.assertEqual(len(spec["slides"]), 18)
        self.assertEqual(spec["slides"][-1], {"tipo": "final", "responsavel": "fabio", "notas": spec["slides"][-1]["notas"]})


if __name__ == "__main__":
    unittest.main()
