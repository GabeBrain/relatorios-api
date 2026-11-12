"""extract/extrair.py: um arquivo de cada tipo, arquivos ruins recusados sem derrubar o inventário."""

from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

from apoio import LIB, Ambiente

sys.path.insert(0, str(LIB / "extract"))
import docx  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from PIL import Image  # noqa: E402

import extrair  # noqa: E402

# PDF mínimo com uma página de texto (objetos e xref escritos à mão).
def pdf_minimo(texto: str) -> bytes:
    conteudo = f"BT /F1 24 Tf 72 720 Td ({texto}) Tj ET".encode()
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(conteudo)).encode() + b" >>\nstream\n" + conteudo + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + o + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


class Extracao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        amb = Ambiente.obter()
        cls.tmp = Path(tempfile.mkdtemp(prefix="extrair-"))
        e = cls.tmp / "entrada"
        e.mkdir()
        (e / "deck.pptx").write_bytes(amb.referencia.read_bytes())
        wb = Workbook()
        ws = wb.active
        ws.title = "Dados"
        ws.append(["Município", "UF", "Vagos 2022"])
        for i in range(400):
            ws.append([f"Cidade {i}", "SC", i * 10])
        ws["E1"] = "=SUM(C2:C401)"
        wb.save(e / "planilha.xlsx")
        (e / "estudo.pdf").write_bytes(pdf_minimo("Vacancia de 12,6% em 2022"))
        d = docx.Document()
        d.add_heading("Briefing do evento", level=1)
        d.add_paragraph("Palestra no ADIT Cidades 2026.")
        d.add_paragraph("Florianópolis", style="List Bullet")
        t = d.add_table(rows=2, cols=2)
        t.cell(0, 0).text, t.cell(0, 1).text, t.cell(1, 0).text, t.cell(1, 1).text = "Item", "Valor", "Tempo", "40 min"
        buf = io.BytesIO()
        Image.effect_noise((300, 200), 80).convert("RGB").save(buf, "PNG")
        d.add_picture(io.BytesIO(buf.getvalue()))
        d.save(e / "briefing.docx")
        Image.new("RGB", (800, 600), (91, 117, 55)).save(e / "foto.jpg", dpi=(300, 300))
        (e / "falso.pdf").write_bytes(b"isto nao e um pdf")
        with zipfile.ZipFile(e / "bomba.xlsx", "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("xl/worksheets/sheet1.xml", b"\0" * 30_000_000)
        (e / "notas.txt").write_text("ignorado")
        cls.inv = cls.tmp / "inventario"
        cls.r = extrair.extrair(e, cls.inv)
        cls.por_nome = {a["arquivo"]: a for a in cls.r["arquivos"]}

    def ler(self, nome: str):
        return json.loads((self.inv / nome).read_text(encoding="utf-8"))

    def test_status_por_arquivo(self):
        st = {k: v["status"] for k, v in self.por_nome.items()}
        self.assertEqual(st, {"deck.pptx": "ok", "planilha.xlsx": "ok", "estudo.pdf": "ok", "briefing.docx": "ok",
                              "foto.jpg": "ok", "falso.pdf": "erro", "bomba.xlsx": "recusado", "notas.txt": "ignorado"})
        self.assertIn("bomba de compressão", self.por_nome["bomba.xlsx"]["motivo"])
        self.assertTrue((self.inv / "inventario.json").is_file())

    def test_pptx(self):
        j = self.ler("deck.pptx.json")
        self.assertEqual(len(j["slides"]), 18)
        s4 = j["slides"][3]
        self.assertEqual(s4["titulo"], "O ESTOQUE CRESCEU 5 VEZES MAIS QUE A POPULAÇÃO")
        graf = next(f["grafico"] for f in s4["formas"] if "grafico" in f)
        self.assertEqual(graf["categorias"], ["População", "Domicílios ocupados", "Total de domicílios", "Domicílios vagos"])
        self.assertEqual(graf["series"][0]["valores"], [6.5, 26.2, 34.2, 87.0])
        self.assertIn("3,31 para 2,79", s4["notas"])
        tabela = next(f["tabela"] for f in j["slides"][11]["formas"] if "tabela" in f)
        self.assertEqual(tabela[1][:3], ["São Paulo", "293,6 mil", "589,0 mil"])
        self.assertTrue(any(f.get("imagem") for f in j["slides"][17]["formas"]))

    def test_xlsx_amostra_com_total(self):
        aba = self.ler("planilha.xlsx.json")["abas"][0]
        self.assertEqual(aba["total_linhas"], 401)
        self.assertTrue(aba["amostra"])
        self.assertEqual(len(aba["linhas"]), extrair.LIMITES["xlsx_linhas_por_aba"])
        self.assertEqual(aba["linhas"][1], ["Cidade 0", "SC", 0])

    def test_pdf_texto_por_pagina(self):
        j = self.ler("estudo.pdf.json")
        self.assertEqual(len(j["paginas"]), 1)
        self.assertIn("12,6%", j["paginas"][0]["texto"])

    def test_docx_em_markdown(self):
        md = (self.inv / "briefing.docx.md").read_text(encoding="utf-8")
        self.assertIn("# Briefing do evento", md)
        self.assertIn("- Florianópolis", md)
        self.assertIn("| Tempo | 40 min |", md)
        self.assertTrue(any((self.inv / "assets" / "briefing").iterdir()))

    def test_imagem(self):
        j = self.ler("foto.jpg.json")
        self.assertEqual((j["largura_px"], j["altura_px"], j["dpi"]), (800, 600, [300, 300]))

    def test_entrada_nao_e_alterada(self):
        self.assertEqual(sorted(p.name for p in (self.tmp / "entrada").iterdir()),
                         ["bomba.xlsx", "briefing.docx", "deck.pptx", "estudo.pdf", "falso.pdf", "foto.jpg", "notas.txt", "planilha.xlsx"])


if __name__ == "__main__":
    unittest.main()
