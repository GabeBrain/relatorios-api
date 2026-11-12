"""Teste de fumaça do build (INSTRUCOES_DESENVOLVIMENTO.md §10).

Gera um slide com Neo Sans Pro e Montserrat, renderiza com o LibreOffice e falha o build se:
  - a conversão PPTX → PDF ou PDF → PNG não funcionar;
  - alguma das duas fontes não estiver embutida no PDF (o LibreOffice teria trocado por outra).

O teste do deck de referência completo (18 PNGs) entra na Fase 3, junto com lib/brain-deck e
lib/apply_theme.js, de que ele depende.
"""
import pathlib
import subprocess
import sys

from pptx import Presentation
from pptx.util import Inches, Pt

saida = pathlib.Path("/tmp/fumaca")
saida.mkdir(parents=True, exist_ok=True)

apresentacao = Presentation()
apresentacao.slide_width = Inches(13.333)
apresentacao.slide_height = Inches(7.5)
slide = apresentacao.slides.add_slide(apresentacao.slide_layouts[6])
for i, (fonte, texto) in enumerate([
    ("Neo Sans Pro", "O BRASIL DOS DOMICÍLIOS VAZIOS"),
    ("Montserrat", "Um em cada oito domicílios está vago: ação, pão, número 11,4 mi"),
]):
    caixa = slide.shapes.add_textbox(Inches(0.6), Inches(0.6 + i * 1.4), Inches(12), Inches(1.2))
    run = caixa.text_frame.paragraphs[0].add_run()
    run.text = texto
    run.font.name = fonte
    run.font.size = Pt(32)

pptx = saida / "fumaca.pptx"
apresentacao.save(pptx)

subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(saida), str(pptx)], check=True, timeout=300)
pdf = saida / "fumaca.pdf"
if not pdf.exists():
    sys.exit("FALHA: o LibreOffice não gerou o PDF")

fontes = subprocess.run(["pdffonts", str(pdf)], capture_output=True, text=True, check=True).stdout
compacto = fontes.lower().replace(" ", "")
for nome in ("neosanspro", "montserrat"):
    if nome not in compacto:
        sys.exit(f"FALHA: a fonte {nome} não foi usada no PDF (substituída pelo LibreOffice):\n{fontes}")

subprocess.run(["pdftoppm", "-png", "-r", "40", str(pdf), str(saida / "slide")], check=True)
pngs = sorted(saida.glob("slide*.png"))
if len(pngs) != 1:
    sys.exit(f"FALHA: esperava 1 PNG, foram gerados {len(pngs)}")

print("Fumaça OK: LibreOffice renderizou o slide com Neo Sans Pro e Montserrat.")
print(fontes)
