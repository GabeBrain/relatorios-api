"""Renderiza um .pptx em PDF e PNGs, um por slide (INSTRUCOES §6.1, doc 03 etapa 5).

    python lib/render.py saida/deck.pptx trabalho/thumbs [--dpi 60]

LibreOffice converte para PDF; o pypdfium2 (dependência do pdfplumber) rasteriza as páginas.
Imprime um JSON com o PDF, os PNGs e as fontes embutidas no PDF: se aparecer uma fonte fora de
Neo Sans Pro / Montserrat, o LibreOffice substituiu a fonte e a imagem não é fiel ao deck.

Cada execução usa um perfil próprio do LibreOffice (-env:UserInstallation), para que duas fases
simultâneas na mesma instância não disputem o mesmo perfil.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader

TEMPO_MAXIMO_S = 240


def achar_soffice() -> str:
    for candidato in (os.environ.get("SOFFICE"), shutil.which("soffice"), shutil.which("libreoffice"),
                      r"C:\Program Files\LibreOffice\program\soffice.exe"):
        if candidato and Path(candidato).exists():
            return candidato
    raise FileNotFoundError("LibreOffice (soffice) não encontrado; defina SOFFICE")


def fontes_do_pdf(pdf: Path) -> list[str]:
    nomes: set[str] = set()
    for pagina in PdfReader(pdf).pages:
        fontes = (pagina.get("/Resources") or {}).get("/Font") or {}
        for ref in fontes.values():
            base = str(ref.get_object().get("/BaseFont", ""))
            nomes.add(re.sub(r"^/?[A-Z]{6}\+", "", base).lstrip("/"))
    return sorted(n for n in nomes if n)


def renderizar(pptx: Path, destino: Path, dpi: int = 60) -> dict:
    if not pptx.is_file():
        raise FileNotFoundError(f"arquivo não encontrado: {pptx}")
    destino.mkdir(parents=True, exist_ok=True)
    for antigo in destino.glob("slide-*.png"):
        antigo.unlink()
    with tempfile.TemporaryDirectory(prefix="render-") as tmp:
        perfil = Path(tmp, "perfil").resolve().as_uri()
        cmd = [achar_soffice(), f"-env:UserInstallation={perfil}", "--headless", "--norestore",
               "--convert-to", "pdf", "--outdir", tmp, str(pptx)]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=TEMPO_MAXIMO_S)
        pdf_tmp = Path(tmp, pptx.with_suffix(".pdf").name)
        if r.returncode != 0 or not pdf_tmp.is_file():
            raise RuntimeError(f"LibreOffice falhou ({r.returncode}): {(r.stderr or r.stdout).strip()[:500]}")
        pdf = destino / pdf_tmp.name
        shutil.copyfile(pdf_tmp, pdf)
    doc = pdfium.PdfDocument(str(pdf))
    pngs = []
    try:
        for i in range(len(doc)):
            img = doc[i].render(scale=dpi / 72).to_pil()
            arq = destino / f"slide-{i + 1:02d}.png"
            img.save(arq)
            pngs.append(str(arq))
    finally:
        doc.close()
    return {"pdf": str(pdf), "pngs": pngs, "paginas": len(pngs), "fontes_pdf": fontes_do_pdf(pdf)}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("pptx", type=Path)
    ap.add_argument("destino", type=Path)
    ap.add_argument("--dpi", type=int, default=60)
    a = ap.parse_args(argv)
    try:
        r = renderizar(a.pptx, a.destino, a.dpi)
    except Exception as e:  # noqa: BLE001 — mensagem curta para o agente
        print(json.dumps({"erro": str(e)}, ensure_ascii=False))
        return 1
    print(json.dumps(r, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
