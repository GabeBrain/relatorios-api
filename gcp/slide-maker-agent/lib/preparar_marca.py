"""Prepara os ativos de marca derivados (INSTRUCOES §6.1 e §6.4).

Roda no build da imagem, depois de baixar a pasta marca/ do bucket privado:

    python lib/preparar_marca.py /app/marca

Gera marca/derivados/:
  logo_tag.png, logo_sem.png, logo_branco_tag.png, logo_branco_sem.png
      logos oficiais recortadas na área visível (Logo-Brain.png tem canvas 1080×1080 com margem; doc 02 §2);
  manifesto.json
      dimensões e proporção de cada logo derivada, e o sha256 de cada slide final (E3 do lint).

Só recorta: não redimensiona, não recolore e não altera a proporção da logo (doc 02 §2, 🔒).
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

LOGOS = {
    # derivado: (arquivo oficial em marca/logos/, tem tagline, negativa/branca)
    "logo_tag.png": ("Logo-Brain.png", True, False),
    "logo_sem.png": ("Logo-Brain-Sem tagline.png", False, False),
    "logo_branco_tag.png": ("Logo-Brain-Branco.png", True, True),
    "logo_branco_sem.png": ("Logo-Brain-Branco-Sem tagline.png", False, True),
}
RESPONSAVEIS = ("fabio", "guilherme", "finoti")


def sha256(caminho: Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()


def recortar(im: Image.Image) -> Image.Image:
    """Recorta a margem transparente (ou branca, se a imagem não tiver alfa)."""
    if im.mode in ("RGBA", "LA") or "transparency" in im.info:
        caixa = im.convert("RGBA").getchannel("A").getbbox()
    else:
        cinza = im.convert("L").point(lambda v: 255 if v < 250 else 0)
        caixa = cinza.getbbox()
    if not caixa:
        raise ValueError("imagem vazia")
    return im.crop(caixa)


def preparar(marca: Path) -> dict:
    destino = marca / "derivados"
    destino.mkdir(exist_ok=True)
    manifesto: dict = {"logos": {}, "slides_finais": {}}
    for derivado, (oficial, tagline, negativa) in LOGOS.items():
        origem = marca / "logos" / oficial
        if not origem.is_file():
            raise FileNotFoundError(f"logo oficial ausente: logos/{oficial}")
        with Image.open(origem) as im:
            recorte = recortar(im)
            recorte.save(destino / derivado, optimize=True)
            manifesto["logos"][derivado] = {
                "oficial": oficial,
                "tagline": tagline,
                "negativa": negativa,
                "largura_px": recorte.width,
                "altura_px": recorte.height,
                "proporcao": round(recorte.width / recorte.height, 5),
            }
    for resp in RESPONSAVEIS:
        arq = marca / "slides-finais" / f"{resp}.png"
        if not arq.is_file():
            raise FileNotFoundError(f"slide final ausente: slides-finais/{resp}.png")
        manifesto["slides_finais"][resp] = {"arquivo": f"slides-finais/{resp}.png", "sha256": sha256(arq)}
    (destino / "manifesto.json").write_text(json.dumps(manifesto, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifesto


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("uso: python lib/preparar_marca.py <pasta marca>", file=sys.stderr)
        sys.exit(2)
    m = preparar(Path(sys.argv[1]))
    for nome, info in m["logos"].items():
        print(f"{nome}: {info['largura_px']}×{info['altura_px']}")
    print(f"slides finais: {', '.join(m['slides_finais'])}")
