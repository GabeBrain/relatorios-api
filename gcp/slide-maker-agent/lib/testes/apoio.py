"""Apoio aos testes da lib/ (unittest, sem dependências além das do requirements.txt).

Variáveis de ambiente:
  SLIDE_MAKER_MARCA   pasta de marca real (logos/, slides-finais/). Sem ela, gera uma marca sintética.
  SLIDE_MAKER_FONTES  pasta com Neo Sans Pro e Montserrat (padrão: /usr/local/share/fonts/brain).
  SLIDE_MAKER_EXIGIR  "1" transforma em falha os testes que seriam pulados por falta de fonte, LibreOffice
                      ou marca real. O build da imagem roda assim: lá nada pode ser pulado em silêncio.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

SERVICO = Path(__file__).resolve().parents[2]
LIB = SERVICO / "lib"
sys.path.insert(0, str(LIB))

import preparar_marca  # noqa: E402

SPEC_REFERENCIA = LIB / "brain-deck" / "exemplos" / "domicilios_v3.json"
EXIGIR = os.environ.get("SLIDE_MAKER_EXIGIR") == "1"


def exigir_ou_pular(caso: unittest.TestCase, condicao: bool, motivo: str) -> None:
    if condicao:
        return
    if EXIGIR:
        caso.fail(f"SLIDE_MAKER_EXIGIR=1 e {motivo}")
    caso.skipTest(motivo)


def pasta_fontes() -> Path | None:
    p = Path(os.environ.get("SLIDE_MAKER_FONTES", "/usr/local/share/fonts/brain"))
    return p if p.is_dir() else None


def _logo(largura: int, altura: int, cor: tuple, tagline: bool) -> Image.Image:
    im = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    corpo = int(altura * (0.7 if tagline else 1.0))
    for k, x in enumerate(range(0, largura - 20, largura // 6)):
        d.rectangle([x, 0 if k % 2 else corpo // 4, x + largura // 9, corpo - 1], fill=cor + (255,))
    if tagline:
        d.rectangle([0, int(altura * 0.8), largura - 1, altura - 1], fill=(88, 89, 91, 255))
    return im


def marca_sintetica(destino: Path) -> Path:
    """Logos e slides finais falsos com a mesma estrutura dos oficiais (proporções 3,7 e 3,2)."""
    (destino / "logos").mkdir(parents=True)
    (destino / "slides-finais").mkdir()
    verde, branco = (91, 117, 55), (255, 255, 255)
    _logo(370, 100, verde, False).save(destino / "logos" / "Logo-Brain-Sem tagline.png")
    _logo(370, 100, branco, False).save(destino / "logos" / "Logo-Brain-Branco-Sem tagline.png")
    _logo(320, 100, branco, True).save(destino / "logos" / "Logo-Brain-Branco.png")
    canvas = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    canvas.paste(_logo(320, 100, verde, True), (40, 150))
    canvas.save(destino / "logos" / "Logo-Brain.png")
    for i, resp in enumerate(("fabio", "guilherme", "finoti")):
        im = Image.new("RGB", (1920, 1080), (242, 242, 242))
        ImageDraw.Draw(im).rectangle([100 + i * 300, 200, 700 + i * 300, 800], fill=(91, 117, 55))
        im.save(destino / "slides-finais" / f"{resp}.png")
    return destino


class Ambiente:
    """Marca preparada + deck de referência construído pela brain-deck, uma vez por processo."""

    _instancia: "Ambiente | None" = None

    def __init__(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="slide-maker-lib-"))
        real = os.environ.get("SLIDE_MAKER_MARCA")
        if real and Path(real, "logos").is_dir():
            self.marca = self.tmp / "marca"
            shutil.copytree(real, self.marca, ignore=shutil.ignore_patterns("fontes", "derivados"))
            self.marca_real = True
        else:
            self.marca = marca_sintetica(self.tmp / "marca")
            self.marca_real = False
        preparar_marca.preparar(self.marca)
        self.referencia = self.tmp / "referencia.pptx"
        construir(SPEC_REFERENCIA, self.referencia, self.marca)

    @classmethod
    def obter(cls) -> "Ambiente":
        if cls._instancia is None:
            cls._instancia = Ambiente()
        return cls._instancia


def construir(spec: Path, saida: Path, marca: Path, cwd: Path | None = None) -> subprocess.CompletedProcess:
    r = subprocess.run(["node", str(LIB / "brain-deck" / "build.js"), str(spec), str(saida), "--marca", str(marca)],
                       capture_output=True, text=True, encoding="utf-8", cwd=cwd or SERVICO, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"brain-deck falhou: {r.stderr or r.stdout}")
    return r
