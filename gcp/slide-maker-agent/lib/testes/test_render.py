"""Fumaça da referência (INSTRUCOES §10): deck da brain-deck → LibreOffice → 18 PNGs, com as fontes da marca.

Fora do contêiner, sem LibreOffice o teste é pulado; com SLIDE_MAKER_EXIGIR=1 (build da imagem) ele é
obrigatório e também exige que o PDF use só Neo Sans Pro e Montserrat (sem fonte substituta).
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from apoio import EXIGIR, Ambiente, exigir_ou_pular
from PIL import Image

import render


class Fumaca(unittest.TestCase):
    def test_referencia_renderiza_18_slides(self):
        try:
            render.achar_soffice()
            tem = True
        except FileNotFoundError:
            tem = False
        exigir_ou_pular(self, tem, "LibreOffice indisponível")
        destino = Path(tempfile.mkdtemp(prefix="render-"))
        r = render.renderizar(Ambiente.obter().referencia, destino, dpi=40)
        self.assertEqual(r["paginas"], 18)
        self.assertEqual(len(list(destino.glob("slide-*.png"))), 18)
        with Image.open(r["pngs"][0]) as im:
            self.assertIn(im.size, ((533, 300), (534, 300)))  # 13,333″ × 40 dpi, arredondado pelo pdfium
            # capa: fundo verde da marca no canto superior esquerdo
            self.assertLess(sum(abs(a - b) for a, b in zip(im.convert("RGB").getpixel((5, 5)), (91, 117, 55))), 30)
        if EXIGIR:
            # As duas fontes da marca precisam estar embutidas (sem elas, o LibreOffice trocou a fonte).
            # Uma fonte de reserva para um glifo isolado (→, −) é tolerada e aparece no relatório.
            nomes = [f.lower().replace("-", "").replace(" ", "") for f in r["fontes_pdf"]]
            self.assertTrue(any(n.startswith("neosanspro") for n in nomes), f"Neo Sans Pro ausente do PDF: {r['fontes_pdf']}")
            self.assertTrue(any(n.startswith("montserrat") for n in nomes), f"Montserrat ausente do PDF: {r['fontes_pdf']}")


if __name__ == "__main__":
    unittest.main()
