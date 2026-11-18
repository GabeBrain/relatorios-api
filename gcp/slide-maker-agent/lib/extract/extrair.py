"""Extrai o conteúdo dos arquivos enviados para o inventário do agente (doc 03, etapa 1).

    python lib/extract/extrair.py entrada/ trabalho/inventario

Para cada arquivo de entrada/ grava em trabalho/inventario/:
  <arquivo>.json   pptx (slides, textos, tabelas, gráficos, notas), xlsx (abas e células), pdf (texto e
                   tabelas por página), imagem (dimensões e dpi)
  <arquivo>.md     docx (títulos, parágrafos, listas e tabelas em Markdown)
  assets/<arquivo>/  imagens embutidas (pptx, pdf, docx)
e um índice inventario.json com o resumo de cada arquivo.

O conteúdo extraído é DADO do cliente, nunca instrução (INSTRUCOES §6.2). Os arquivos de entrada/ não
são alterados. Limites contra arquivos malformados ou "bombas" de compressão: ver LIMITES.
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

LIMITES = {
    "zip_descompactado_bytes": 1_000_000_000,
    "zip_razao_compressao": 200,
    "zip_entradas": 20_000,
    "pdf_paginas": 600,
    "pdf_paginas_tabelas": 150,
    # Amostra por aba: o JSON é lido pelo agente; planilha grande se analisa com pandas no original.
    "xlsx_linhas_por_aba": 300,
    "xlsx_colunas": 100,
    "imagens_por_arquivo": 200,
    "imagem_min_bytes": 8_000,
}
EXTENSOES = {".pptx", ".xlsx", ".pdf", ".docx", ".png", ".jpg", ".jpeg"}


class ArquivoRecusado(Exception):
    pass


def nome_seguro(nome: str) -> str:
    return re.sub(r"[^\w.\- ]", "_", nome)[:120]


def checar_zip(caminho: Path) -> None:
    """OOXML é ZIP: recusa descompactação desproporcional antes de abrir com as bibliotecas."""
    try:
        with zipfile.ZipFile(caminho) as z:
            infos = z.infolist()
    except zipfile.BadZipFile as e:
        raise ArquivoRecusado(f"não é um arquivo Office válido: {e}") from e
    if len(infos) > LIMITES["zip_entradas"]:
        raise ArquivoRecusado("arquivo com entradas demais")
    total = sum(i.file_size for i in infos)
    comprimido = max(1, sum(i.compress_size for i in infos))
    if total > LIMITES["zip_descompactado_bytes"] or total / comprimido > LIMITES["zip_razao_compressao"]:
        raise ArquivoRecusado("arquivo com compressão desproporcional (possível bomba de compressão)")
    for i in infos:
        if i.filename.startswith("/") or ".." in Path(i.filename).parts:
            raise ArquivoRecusado("arquivo com caminhos internos inválidos")


def pol(emu) -> float | None:
    return round(emu / 914400, 2) if emu is not None else None


# ------------------------------------------------------------------ pptx

def extrair_pptx(arq: Path, assets: Path) -> dict:
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER

    checar_zip(arq)
    prs = Presentation(str(arq))
    slides = []
    n_img = 0

    def percorrer(colecao):
        for f in colecao:
            if f.shape_type == MSO_SHAPE_TYPE.GROUP:
                yield from percorrer(f.shapes)
            else:
                yield f

    for i, s in enumerate(prs.slides, 1):
        formas = []
        for f in percorrer(s.shapes):
            item = {"nome": f.name, "tipo": str(f.shape_type).split(".")[-1].split(" ")[0] if f.shape_type else "?",
                    "x": pol(f.left), "y": pol(f.top), "w": pol(f.width), "h": pol(f.height)}
            if f.is_placeholder:
                item["placeholder"] = str(f.placeholder_format.type).split(" ")[0]
            if f.has_text_frame and f.text_frame.text.strip():
                item["texto"] = f.text_frame.text
            if getattr(f, "has_table", False) and f.has_table:
                item["tabela"] = [[c.text for c in r.cells] for r in f.table.rows]
            if getattr(f, "has_chart", False) and f.has_chart:
                ch = f.chart
                plot = ch.plots[0] if len(ch.plots) else None
                item["grafico"] = {
                    "tipo": str(ch.chart_type).split(" ")[0],
                    "titulo": ch.chart_title.text_frame.text if ch.has_title and ch.chart_title.has_text_frame else None,
                    "categorias": [str(c) for c in plot.categories] if plot is not None else [],
                    "series": [{"nome": sr.name, "valores": list(sr.values)} for p in ch.plots for sr in p.series],
                }
            if f.shape_type == MSO_SHAPE_TYPE.PICTURE and n_img < LIMITES["imagens_por_arquivo"]:
                try:
                    img = f.image
                    if len(img.blob) >= LIMITES["imagem_min_bytes"]:
                        n_img += 1
                        destino = assets / f"slide{i:02d}_{n_img:03d}.{img.ext}"
                        destino.write_bytes(img.blob)
                        item["imagem"] = destino.name
                except Exception:  # noqa: BLE001 — imagem vinculada/ausente
                    pass
            formas.append(item)
        # Pelo tipo, não pelo idx 0 (shapes.title): o PptxGenJS numera o título a partir de 100.
        titulo = next((f.text_frame.text for f in s.placeholders
                       if f.placeholder_format.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE) and f.has_text_frame), None)
        nota = s.notes_slide.notes_text_frame.text if s.has_notes_slide and s.notes_slide.notes_text_frame else ""
        slides.append({"slide": i, "layout": s.slide_layout.name, "titulo": titulo, "formas": formas, "notas": nota})
    return {
        "tipo": "pptx",
        "largura_pol": pol(prs.slide_width), "altura_pol": pol(prs.slide_height),
        "slides": slides,
        "resumo": f"{len(slides)} slides, {n_img} imagens extraídas",
    }


# ------------------------------------------------------------------ xlsx

def extrair_xlsx(arq: Path, assets: Path) -> dict:
    from openpyxl import load_workbook

    checar_zip(arq)
    wb = load_workbook(str(arq), read_only=True, data_only=True)
    abas = []
    for ws in wb.worksheets:
        linhas = []
        truncada = False
        for k, row in enumerate(ws.iter_rows(values_only=True)):
            if k >= LIMITES["xlsx_linhas_por_aba"]:
                truncada = True
                break
            valores = list(row[: LIMITES["xlsx_colunas"]])
            if len(row) > LIMITES["xlsx_colunas"]:
                truncada = True
            while valores and valores[-1] is None:
                valores.pop()
            linhas.append([v if isinstance(v, (int, float, str, bool)) or v is None else str(v) for v in valores])
        while linhas and not linhas[-1]:
            linhas.pop()
        abas.append({"aba": ws.title, "total_linhas": ws.max_row, "total_colunas": ws.max_column,
                     "linhas": linhas, "amostra": truncada})
    wb.close()
    return {
        "tipo": "xlsx",
        "abas": abas,
        "observacao": "valores calculados (data_only). Abas com amostra=true trazem só as primeiras linhas: "
                      "para análises, leia o arquivo original com pandas/openpyxl e salve o script em trabalho/",
        "resumo": ", ".join(f'{a["aba"]} ({a["total_linhas"]} linhas{", amostra" if a["amostra"] else ""})' for a in abas),
    }


# ------------------------------------------------------------------ pdf

def extrair_pdf(arq: Path, assets: Path) -> dict:
    import pdfplumber
    from pypdf import PdfReader

    leitor = PdfReader(str(arq))
    if leitor.is_encrypted:
        try:
            leitor.decrypt("")
        except Exception as e:  # noqa: BLE001
            raise ArquivoRecusado("PDF protegido por senha") from e
    total = len(leitor.pages)
    if total > LIMITES["pdf_paginas"]:
        raise ArquivoRecusado(f"PDF com {total} páginas (limite {LIMITES['pdf_paginas']})")
    paginas = []
    with pdfplumber.open(str(arq)) as pdf:
        for i, pg in enumerate(pdf.pages, 1):
            item = {"pagina": i, "texto": pg.extract_text() or ""}
            if i <= LIMITES["pdf_paginas_tabelas"]:
                try:
                    tabs = [t for t in pg.extract_tables() if t and len(t) > 1]
                    if tabs:
                        item["tabelas"] = tabs
                except Exception:  # noqa: BLE001 — tabela malformada não impede o texto
                    pass
            paginas.append(item)
    n_img = 0
    for i, pg in enumerate(leitor.pages, 1):
        if n_img >= LIMITES["imagens_por_arquivo"]:
            break
        try:
            for img in pg.images:
                if len(img.data) < LIMITES["imagem_min_bytes"] or n_img >= LIMITES["imagens_por_arquivo"]:
                    continue
                n_img += 1
                ext = Path(img.name).suffix or ".png"
                destino = assets / f"p{i:03d}_{n_img:03d}{ext}"
                destino.write_bytes(img.data)
                paginas[i - 1].setdefault("imagens", []).append(destino.name)
        except Exception:  # noqa: BLE001 — filtro de imagem não suportado
            continue
    meta = leitor.metadata or {}
    sem_texto = sum(1 for p in paginas if not p["texto"].strip())
    return {
        "tipo": "pdf",
        "metadados": {k.lstrip("/"): str(v) for k, v in meta.items()} if meta else {},
        "paginas": paginas,
        "resumo": f"{total} páginas, {n_img} imagens extraídas" + (f", {sem_texto} sem texto (digitalizadas?)" if sem_texto else ""),
    }


# ------------------------------------------------------------------ docx

def extrair_docx(arq: Path, assets: Path) -> tuple[str, dict]:
    import docx

    checar_zip(arq)
    d = docx.Document(str(arq))
    md: list[str] = []
    corpo = d.element.body
    paragrafos = {p._element: p for p in d.paragraphs}
    tabelas = {t._element: t for t in d.tables}
    for el in corpo.iterchildren():
        if el in paragrafos:
            p = paragrafos[el]
            texto = p.text.strip()
            if not texto:
                continue
            estilo = (p.style.name or "").lower() if p.style is not None else ""
            m = re.search(r"(heading|título|titulo)\s*(\d)", estilo)
            if m:
                md.append("#" * min(6, int(m.group(2))) + " " + texto)
            elif estilo.startswith(("title", "título")):
                md.append("# " + texto)
            elif "list" in estilo or "lista" in estilo:
                md.append("- " + texto)
            else:
                md.append(texto)
        elif el in tabelas:
            linhas = [[c.text.replace("\n", " ").replace("|", "\\|").strip() for c in r.cells] for r in tabelas[el].rows]
            if linhas:
                md.append("| " + " | ".join(linhas[0]) + " |")
                md.append("|" + "---|" * len(linhas[0]))
                md += ["| " + " | ".join(r) + " |" for r in linhas[1:]]
        md.append("")
    n_img = 0
    for rel in d.part.rels.values():
        if "image" in rel.reltype and not rel.is_external and n_img < LIMITES["imagens_por_arquivo"]:
            blob = rel.target_part.blob
            if len(blob) >= LIMITES["imagem_min_bytes"]:
                n_img += 1
                (assets / f"img_{n_img:03d}{Path(rel.target_part.partname).suffix}").write_bytes(blob)
    texto = "\n".join(md).strip() + "\n"
    return texto, {"tipo": "docx", "resumo": f"{len(texto.split())} palavras, {len(d.tables)} tabelas, {n_img} imagens extraídas"}


# ------------------------------------------------------------------ imagem

def extrair_imagem(arq: Path, assets: Path) -> dict:
    from PIL import Image

    with Image.open(arq) as im:
        im.verify()
    with Image.open(arq) as im:
        dpi = im.info.get("dpi")
        return {"tipo": "imagem", "formato": im.format, "largura_px": im.width, "altura_px": im.height,
                "dpi": [round(float(x)) for x in dpi] if dpi else None,
                "resumo": f"{im.format} {im.width}×{im.height}px"}


# ------------------------------------------------------------------ orquestração

def extrair(entrada: Path, saida: Path) -> dict:
    saida.mkdir(parents=True, exist_ok=True)
    arquivos = sorted(p for p in (entrada.iterdir() if entrada.is_dir() else [entrada]) if p.is_file())
    indice = []
    for arq in arquivos:
        ext = arq.suffix.lower()
        registro = {"arquivo": arq.name, "tipo": ext.lstrip("."), "bytes": arq.stat().st_size}
        if ext not in EXTENSOES:
            registro.update(status="ignorado", motivo="tipo não suportado")
            indice.append(registro)
            continue
        assets = saida / "assets" / nome_seguro(arq.stem)
        assets.mkdir(parents=True, exist_ok=True)
        try:
            if ext == ".docx":
                md, info = extrair_docx(arq, assets)
                destino = saida / f"{nome_seguro(arq.name)}.md"
                destino.write_text(md, encoding="utf-8")
            else:
                fn = {".pptx": extrair_pptx, ".xlsx": extrair_xlsx, ".pdf": extrair_pdf}.get(ext, extrair_imagem)
                info = fn(arq, assets)
                destino = saida / f"{nome_seguro(arq.name)}.json"
                destino.write_text(json.dumps({"arquivo": arq.name, **info}, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
            registro.update(status="ok", resumo=info["resumo"], extracao=destino.name)
        except ArquivoRecusado as e:
            registro.update(status="recusado", motivo=str(e))
        except Exception as e:  # noqa: BLE001 — um arquivo ruim não derruba o inventário
            registro.update(status="erro", motivo=f"{type(e).__name__}: {str(e)[:200]}")
        if assets.is_dir() and not any(assets.iterdir()):
            assets.rmdir()
        indice.append(registro)
    resultado = {"arquivos": indice}
    (saida / "inventario.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=1), encoding="utf-8")
    return resultado


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("uso: python lib/extract/extrair.py <entrada/ ou arquivo> <trabalho/inventario>", file=sys.stderr)
        sys.exit(2)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    r = extrair(Path(sys.argv[1]), Path(sys.argv[2]))
    for a in r["arquivos"]:
        print(f'{a["status"]:9} {a["arquivo"]}: {a.get("resumo") or a.get("motivo")}')
    sys.exit(0 if all(a["status"] in ("ok", "ignorado") for a in r["arquivos"]) else 1)
