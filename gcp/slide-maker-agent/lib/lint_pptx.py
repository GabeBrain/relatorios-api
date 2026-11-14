"""Checagens automáticas do deck (base de conhecimento, doc 05 §1) → trabalho/qa.json.

    python lib/lint_pptx.py saida/deck.pptx --saida trabalho/qa.json \
        [--briefing briefing.yaml] [--fontes trabalho/fontes.json] [--relatorio saida/relatorio.md] \
        [--roteiro saida/roteiro.md] [--responsavel fabio] [--sem-valores] \
        [--marca /app/marca] [--dir-fontes /usr/local/share/fonts/brain]

Cada item é FALHA (🔒, bloqueia a entrega) ou ALERTA. Código de saída: 0 sem falhas, 1 com falhas,
2 erro de uso. O que não pôde ser checado (sem briefing, sem fontes.json, sem hunspell…) vai em
`nao_verificado`, nunca é dado como aprovado.

Decisões de implementação (registradas aqui e no README da lib):
- D2 é ALERTA (INSTRUCOES §5.1) até ser calibrada nos trabalhos dourados.
- T1 (texto transbordando) é estimado com as métricas reais das fontes (Pillow), sem render: quebra de
  linha gulosa por palavra, altura de linha = max(1,2 × corpo, ascendente + descendente da fonte).
- "Tons" (M7) são contados por família de cor do manual (verde, amarelo, azul), sem os neutros.
- Branco (#FFFFFF) é aceito como neutro: é o fundo e o lt1 do tema da referência aprovada.
- As listas de termos (T4–T7, T10, T11) estão nas constantes abaixo, marcadas [calibrar].
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from lxml import etree
from PIL import Image, ImageFont
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.util import Emu

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
EMU_POR_PT = 12700
EMU_POR_POL = 914400

# ------------------------------------------------------------------ marca (doc 02 §3–§4)
# Mantida igual a lib/brain-deck/tema.js (há teste que compara).
PALETA = {
    "5B7537": "verde", "2E3525": "verde", "7CA83E": "verde", "B4DB7D": "verde",
    "FFD500": "amarelo", "B39500": "amarelo", "FFE666": "amarelo", "FFF7CC": "amarelo",
    "1F5F8A": "azul", "143C57": "azul", "3D8ABD": "azul", "C5DFF0": "azul",
    "000000": "neutro", "58595B": "neutro", "BCBEC0": "neutro", "F2F2F2": "neutro", "FFFFFF": "neutro",
}
FONTES_PERMITIDAS = ("neo sans pro", "montserrat", "tahoma")
# Formas fora do sistema de blocos do manual (M3). Blocos oficiais: rect, round1Rect, triângulos, quarto de círculo.
FORMAS_PROIBIDAS = {
    "ellipse", "donut", "flowChartConnector", "flowChartOffpageConnector", "cloud", "cloudCallout", "wave",
    "doubleWave", "irregularSeal1", "irregularSeal2", "heart", "sun", "moon", "smileyFace", "noSmoking",
    "wedgeEllipseCallout", "star4", "star5", "star6", "star7", "star8", "star10", "star12", "star16",
    "star24", "star32", "lightningBolt", "teardrop", "blockArc",
}

# ------------------------------------------------------------------ redação (doc 02 §8 e §11) [calibrar]
# Padrões sobre texto minúsculo e sem acento (ver normalizar()).
T4_PROIBIDOS = [r"\bquitinetes?\b", r"\bkitnets?\b", r"\bgrande potencial\b", r"\bproduto moderno\b",
                r"\bboa oportunidade\b", r"\bo mercado e excelente\b", r"\bha muita demanda\b"]
T5_AUDITORIA = [r"\bconforme (verificado|auditado|checado)\b", r"\bnao foi possivel (verificar|confirmar|validar)\b",
                r"\bdados? nao (auditad|validad|confirmad)\w*", r"\bfonte nao (confirmada|verificada)\b",
                r"\bpendente de (validacao|confirmacao)\b", r"\bsegundo (a|nossa) auditoria\b",
                r"\bconfirmar com o cliente\b", r"\bcomo (um )?modelo de linguagem\b", r"\bgerado por ia\b"]
T6_REVISAO = [r"\btemos que ver\b", r"\bverificar\b", r"\batualizar\s*\?", r"\bnessa secao\b", r"\brevisar\b",
              r"\bconferir (com|se)\b", r"\bver se\b"]
T6_REVISAO_SENSIVEL = [r"\bTODO\b", r"\bFIXME\b", r"\bTBD\b"]  # em maiúsculas: "todo" é palavra comum
T7_PLACEHOLDER = [r"\bespaco para\b", r"\bx{3,}\b", r"\binserir\b", r"\blorem\b", r"\[\s*\]", r"\[pendente\]",
                  r"\bclique para\b", r"\ba definir\b"]
T10_VETADAS = [r"\beu acho que\b", r"\bvou falar um pouquinho\b", r"\bapenas este numero\b",
               r"\b(vc|vcs|pq|tb|tbm|blz|qdo|qto|tds|obg|vlw|ctba)\b", r"\bgalera\b", r"\btipo assim\b",
               r"\bshow de bola\b", r"\bbombando\b", r"\bpra caramba\b"]
SIGLAS = {  # doc 02 §12; extenso aceito na primeira ocorrência (sem acento, minúsculo)
    "VGV": "valor geral de vendas", "VSO": "vendas sobre oferta", "MCMV": "minha casa", "HIS": "habitacao de interesse social",
    "HMP": "habitacao de mercado popular", "SBPE": "sistema brasileiro de poupanca", "FGTS": "fundo de garantia",
    "SFH": "sistema financeiro da habitacao", "CRI": "certificado de recebiveis", "FIDC": "direitos creditorios",
    "FII": "fundo de investimento imobiliario", "ZI": "zona de influencia", "ZEPH": "zona especial",
    "FJP": "fundacao joao pinheiro", "RM": "regiao metropolitana",
}
ANGLICISMOS = [r"\bperformance\b", r"\bcase study\b", r"\btarget\b", r"\bdeadline\b", r"\bfeedback\b", r"\bbudget\b",
               r"\bmindset\b", r"\bbusiness\b", r"\bstakeholders?\b", r"\bplayers?\b"]
GLOSSARIO = {"vgv", "vso", "mcmv", "sbpe", "fgts", "sfh", "cri", "fidc", "fii", "landbank", "permuta", "loteamento",
             "multifamily", "long", "short", "stay", "studios", "retrofit", "zeph", "brain", "incorporador",
             "incorporadores", "requalificavel", "requalificaveis", "vacancia", "akiya", "sidra",
             # Grafia do VOLP que o hunspell-pt-br do Debian não traz (falso positivo no trabalho dourado de 13/11/2026).
             "deficit", "deficits", "superavit", "superavits"}

MESES = {"jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6, "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12}
MESES_EXTENSO = {"janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7,
                 "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12}

# Papéis dos placeholders de corpo nos layouts da brain-deck, na ordem de definição (o título é
# reconhecido pelo tipo). O PptxGenJS numera idx a partir de 100 contando também imagens do layout,
# por isso a ordem vem dos idx ordenados, não do valor absoluto.
PAPEIS_LAYOUT = {
    "Capa": ["subtitulo", "rodape"],
    "Divisor": ["numero", "subtitulo"],
    "Conteudo": ["etiqueta", "apoio", "sub", "fonte"],
}


def normalizar(t: str) -> str:
    t = unicodedata.normalize("NFKD", t)
    return "".join(c for c in t if not unicodedata.combining(c)).lower()


# ------------------------------------------------------------------ resultado

@dataclass
class Resultado:
    arquivo: str
    slides: int = 0
    itens: list[dict] = field(default_factory=list)
    nao_verificado: list[dict] = field(default_factory=list)

    def falha(self, id_: str, slide: int | None, msg: str) -> None:
        self.itens.append({"id": id_, "nivel": "FALHA", "slide": slide, "mensagem": msg})

    def alerta(self, id_: str, slide: int | None, msg: str) -> None:
        self.itens.append({"id": id_, "nivel": "ALERTA", "slide": slide, "mensagem": msg})

    def pular(self, id_: str, motivo: str) -> None:
        self.nao_verificado.append({"id": id_, "motivo": motivo})

    def json(self) -> dict:
        falhas = sum(1 for i in self.itens if i["nivel"] == "FALHA")
        return {
            "arquivo": self.arquivo,
            "slides": self.slides,
            "falhas_bloqueantes": falhas,
            "alertas": len(self.itens) - falhas,
            "itens": sorted(self.itens, key=lambda i: (i["nivel"] != "FALHA", i["slide"] or 0, i["id"])),
            "nao_verificado": self.nao_verificado,
        }


# ------------------------------------------------------------------ modelo do deck

@dataclass
class Texto:
    """Uma forma com texto, já com o papel resolvido."""
    slide: int
    papel: str  # titulo, etiqueta, apoio, sub, fonte, numero, rodape, subtitulo, corpo, tabela, numero_slide
    texto: str
    forma: object  # python-pptx shape


@dataclass
class Imagem:
    slide: int | None
    layout: str | None
    nome: str
    descricao: str
    blob: bytes
    x: float
    y: float
    w: float
    h: float  # polegadas
    elemento: etree._Element
    tipo: str = "foto"  # logo | final | qr | foto
    logo: dict | None = None
    responsavel: str | None = None  # dono do slide final, quando tipo == "final"
    indice_z: int = 0


class Deck:
    def __init__(self, caminho: Path):
        self.caminho = caminho
        self.prs = Presentation(str(caminho))
        self.slides = list(self.prs.slides)
        self.tema = self._ler_tema()

    def _ler_tema(self) -> dict[str, str]:
        mestre = self.prs.slide_master.part
        tema = mestre.part_related_by(RT.THEME)
        raiz = etree.fromstring(tema.blob)
        cores: dict[str, str] = {}
        esquema = raiz.find(".//a:clrScheme", NS)
        for slot in esquema if esquema is not None else []:
            nome = etree.QName(slot).localname
            srgb = slot.find("a:srgbClr", NS)
            sys_ = slot.find("a:sysClr", NS)
            cores[nome] = (srgb.get("val") if srgb is not None else sys_.get("lastClr", "000000")).upper()
        apelidos = {"tx1": "dk1", "bg1": "lt1", "tx2": "dk2", "bg2": "lt2"}
        for a, b in apelidos.items():
            if b in cores:
                cores[a] = cores[b]
        fontes = {}
        for bloco, chave in (("majorFont", "+mj-lt"), ("minorFont", "+mn-lt")):
            el = raiz.find(f".//a:{bloco}/a:latin", NS)
            if el is not None:
                fontes[chave] = el.get("typeface", "")
        self.fontes_tema = fontes
        return cores

    def cor(self, el: etree._Element) -> str | None:
        """HEX de um a:srgbClr / a:schemeClr / a:sysClr."""
        nome = etree.QName(el).localname
        if nome == "srgbClr":
            return el.get("val", "").upper()
        if nome == "schemeClr":
            return self.tema.get(el.get("val", ""))
        if nome == "sysClr":
            return el.get("lastClr", "").upper() or None
        return None

    def cores_em(self, raiz: etree._Element) -> set[str]:
        cores = set()
        for el in raiz.iter(f"{{{NS['a']}}}srgbClr", f"{{{NS['a']}}}schemeClr", f"{{{NS['a']}}}sysClr"):
            if el.get("val") == "phClr":
                continue
            c = self.cor(el)
            if c:
                cores.add(c)
        return cores

    def fonte_real(self, face: str) -> str:
        return self.fontes_tema.get(face, face) if face.startswith("+") else face


def papel_placeholder(forma, layout) -> str:
    pf = forma.placeholder_format
    if pf.type in (PP_PLACEHOLDER.SLIDE_NUMBER, PP_PLACEHOLDER.DATE, PP_PLACEHOLDER.FOOTER):
        return "numero_slide"
    if pf.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
        return "titulo"
    papeis = PAPEIS_LAYOUT.get(layout.name)
    if papeis:
        corpo = sorted(p.placeholder_format.idx for p in layout.placeholders
                       if p.placeholder_format.type == PP_PLACEHOLDER.BODY)
        if pf.idx in corpo and corpo.index(pf.idx) < len(papeis):
            return papeis[corpo.index(pf.idx)]
    return "corpo"


def formas(colecao):
    for f in colecao:
        if f.shape_type == MSO_SHAPE_TYPE.GROUP:
            yield from formas(f.shapes)
        else:
            yield f


def textos_do_slide(deck: Deck, i: int) -> list[Texto]:
    s = deck.slides[i]
    out = []
    for f in formas(s.shapes):
        if f.is_placeholder:
            papel = papel_placeholder(f, s.slide_layout)
        else:
            papel = "corpo"
        if f.has_text_frame and f.text_frame.text.strip():
            if papel == "corpo" and re.match(r"^\s*fontes?\s*:", f.text_frame.text, re.I):
                papel = "fonte"
            out.append(Texto(i + 1, papel, f.text_frame.text, f))
        if getattr(f, "has_table", False) and f.has_table:
            t = "\n".join(c.text for r in f.table.rows for c in r.cells)
            out.append(Texto(i + 1, "tabela", t, f))
    return out


def notas(slide) -> str:
    if not slide.has_notes_slide:
        return ""
    return slide.notes_slide.notes_text_frame.text if slide.notes_slide.notes_text_frame else ""


# ------------------------------------------------------------------ imagens e marca

def pixels_hash(blob: bytes) -> str:
    with Image.open(io.BytesIO(blob)) as im:
        rgb = im.convert("RGB")
        return hashlib.sha256(f"{rgb.width}x{rgb.height}".encode() + rgb.tobytes()).hexdigest()


def recortar_alfa(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    caixa = rgba.getchannel("A").getbbox()
    return rgba.crop(caixa) if caixa else rgba


class Marca:
    def __init__(self, pasta: Path):
        self.pasta = pasta
        self.logos: dict[str, dict] = {}
        self.assinaturas: dict[str, Image.Image] = {}
        oficiais = {
            "logo_tag.png": ("Logo-Brain.png", True, False),
            "logo_sem.png": ("Logo-Brain-Sem tagline.png", False, False),
            "logo_branco_tag.png": ("Logo-Brain-Branco.png", True, True),
            "logo_branco_sem.png": ("Logo-Brain-Branco-Sem tagline.png", False, True),
        }
        for nome, (arq, tagline, negativa) in oficiais.items():
            with Image.open(pasta / "logos" / arq) as im:
                rec = recortar_alfa(im)
            self.logos[nome] = {"tagline": tagline, "negativa": negativa, "proporcao": rec.width / rec.height}
            self.assinaturas[nome] = rec.resize((96, 24))
        # E3 compara os pixels decodificados, não os bytes: o mesmo PNG regravado com outra compressão
        # (visto no deck aprovado de domicílios v3) continua sendo a imagem oficial sem alteração.
        self.finais_bytes: dict[str, str] = {}
        self.finais_pixels: dict[str, str] = {}
        for resp in ("fabio", "guilherme", "finoti"):
            arq = pasta / "slides-finais" / f"{resp}.png"
            if arq.is_file():
                blob = arq.read_bytes()
                self.finais_bytes[hashlib.sha256(blob).hexdigest()] = resp
                self.finais_pixels[pixels_hash(blob)] = resp

    def identificar_final(self, blob: bytes) -> str | None:
        r = self.finais_bytes.get(hashlib.sha256(blob).hexdigest())
        if r:
            return r
        try:
            return self.finais_pixels.get(pixels_hash(blob))
        except Exception:  # noqa: BLE001
            return None

    def identificar_logo(self, blob: bytes) -> dict | None:
        try:
            with Image.open(io.BytesIO(blob)) as im:
                if im.mode not in ("RGBA", "LA", "P") and "transparency" not in im.info:
                    return None
                rec = recortar_alfa(im)
        except Exception:  # noqa: BLE001 — imagem ilegível não é logo
            return None
        prop = rec.width / max(rec.height, 1)
        melhor, dist = None, 1e9
        amostra = rec.resize((96, 24))
        for nome, info in self.logos.items():
            if abs(prop / info["proporcao"] - 1) > 0.06:
                continue
            ref = self.assinaturas[nome]
            d = sum(abs(a - b) for a, b in zip(amostra.tobytes(), ref.tobytes())) / (96 * 24 * 4)
            if d < dist:
                melhor, dist = nome, d
        if melhor and dist < 25:
            return {"arquivo": melhor, **self.logos[melhor]}
        return None


def parece_qr(blob: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(blob)) as im:
            if abs(im.width / im.height - 1) > 0.05:
                return False
            g = im.convert("L").resize((64, 64))
    except Exception:  # noqa: BLE001
        return False
    px = g.tobytes()
    extremos = sum(1 for v in px if v < 60 or v > 200) / len(px)
    escuros = sum(1 for v in px if v < 60) / len(px)
    return extremos > 0.9 and 0.25 < escuros < 0.75


def imagens(deck: Deck, marca: Marca | None) -> list[Imagem]:
    out: list[Imagem] = []

    def coletar(colecao, part, slide, layout):
        for z, f in enumerate(formas(colecao)):
            if f.shape_type != MSO_SHAPE_TYPE.PICTURE and not (f.is_placeholder and hasattr(f, "image")):
                continue
            try:
                blob = f.image.blob
            except Exception:  # noqa: BLE001 — placeholder de imagem vazio
                continue
            cnv = f._element.find(".//p:cNvPr", NS)
            img = Imagem(slide, layout, f.name, (cnv.get("descr", "") if cnv is not None else ""), blob,
                         Emu(f.left).inches, Emu(f.top).inches, Emu(f.width).inches, Emu(f.height).inches,
                         f._element, indice_z=z)
            if marca:
                if img.w >= 6 and (resp := marca.identificar_final(blob)):
                    img.tipo, img.responsavel = "final", resp
                elif (lg := marca.identificar_logo(blob)):
                    img.tipo, img.logo = "logo", lg
            if img.tipo == "foto" and ("qr" in normalizar(img.nome + " " + img.descricao) or parece_qr(blob)):
                img.tipo = "qr"
            out.append(img)

    for i, s in enumerate(deck.slides):
        coletar(s.shapes, s.part, i + 1, None)
    for lay in deck.prs.slide_layouts:
        coletar(lay.shapes, lay.part, None, lay.name)
    coletar(deck.prs.slide_master.shapes, deck.prs.slide_master.part, None, "mestre")
    return out


def fundo(deck: Deck, *els) -> str | None:
    """Cor sólida do fundo, procurando no slide, no layout e no mestre (nessa ordem)."""
    for el in els:
        bg = el.find(".//p:cSld/p:bg", NS)
        if bg is None:
            continue
        solido = bg.find(".//a:solidFill/*", NS)
        if solido is not None:
            return deck.cor(solido)
        ref = bg.find("p:bgRef/*", NS)
        if ref is not None:
            return deck.cor(ref)
        return None  # fundo de imagem/gradiente: indeterminado
    return None


def luminancia(hex_: str) -> float:
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def cor_sob(deck: Deck, img: Imagem) -> str | None:
    """Cor do que está atrás do centro da logo: forma preenchida anterior na ordem z, senão o fundo."""
    cx, cy = img.x + img.w / 2, img.y + img.h / 2
    if img.slide:
        s = deck.slides[img.slide - 1]
        colecao, els = list(formas(s.shapes)), (s._element, s.slide_layout._element, s.slide_layout.slide_master._element)
    else:
        lay = next((l for l in deck.prs.slide_layouts if l.name == img.layout), None)
        if lay is None:
            return fundo(deck, deck.prs.slide_master._element)
        colecao, els = list(formas(lay.shapes)), (lay._element, lay.slide_master._element)
    for f in reversed(colecao[: img.indice_z]):
        if f.left is None or f.width is None:
            continue
        x, y, w, h = (Emu(v).inches for v in (f.left, f.top, f.width, f.height))
        if x <= cx <= x + w and y <= cy <= y + h:
            sp = f._element.find("p:spPr", NS)
            solido = sp.find("a:solidFill/*", NS) if sp is not None else None
            if solido is not None:
                return deck.cor(solido)
    return fundo(deck, *els)


# ------------------------------------------------------------------ medição de texto (T1)

class Medidor:
    def __init__(self, pasta: Path):
        self.arquivos: dict[tuple[str, bool], Path] = {}
        for f in sorted(pasta.rglob("*")):
            if f.suffix.lower() not in (".otf", ".ttf"):
                continue
            try:
                familia, estilo = ImageFont.truetype(str(f), 10).getname()
            except OSError:
                continue
            chave_familia = familia.lower()
            if estilo.lower() == "regular":
                self.arquivos.setdefault((chave_familia, False), f)
            elif estilo.lower() == "bold":
                self.arquivos.setdefault((chave_familia, True), f)
        if not any(k[0] == "montserrat" for k in self.arquivos) or not any(k[0] == "neo sans pro" for k in self.arquivos):
            raise FileNotFoundError("Neo Sans Pro e Montserrat (Regular e Bold) não encontradas em " + str(pasta))

    @lru_cache(maxsize=256)
    def fonte(self, familia: str, negrito: bool, tamanho_pt: float):
        fam = familia.lower()
        arq = self.arquivos.get((fam, negrito)) or self.arquivos.get((fam, False)) or self.arquivos[("montserrat", negrito)]
        f = ImageFont.truetype(str(arq), max(1, round(tamanho_pt * 8)))
        asc, desc = f.getmetrics()
        return f, (asc + desc) / 8

    def largura(self, texto: str, familia: str, negrito: bool, tam: float) -> float:
        f, _ = self.fonte(familia, negrito, tam)
        return f.getlength(texto) / 8

    def altura_linha(self, familia: str, negrito: bool, tam: float) -> float:
        _, h = self.fonte(familia, negrito, tam)
        return max(1.2 * tam, h)


def propriedades_run(r: etree._Element, padrao: dict, deck: Deck) -> tuple[str, bool, float]:
    rpr = r.find("a:rPr", NS)
    face, negrito, tam = padrao.get("face", "+mn-lt"), padrao.get("negrito", False), padrao.get("tam", 18.0)
    if rpr is not None:
        if rpr.get("sz"):
            tam = int(rpr.get("sz")) / 100
        if rpr.get("b") is not None:
            negrito = rpr.get("b") in ("1", "true")
        lat = rpr.find("a:latin", NS)
        if lat is not None and lat.get("typeface"):
            face = lat.get("typeface")
    face = deck.fonte_real(face)
    return face, negrito, tam


def padrao_da_forma(forma, deck: Deck) -> dict:
    p = {"face": "+mn-lt", "negrito": False, "tam": 18.0}
    fontes = []
    lst = forma._element.find(".//p:txBody/a:lstStyle/a:lvl1pPr/a:defRPr", NS)
    if lst is not None:
        fontes.append(lst)
    if forma.is_placeholder:
        try:
            lay = forma.part.slide.slide_layout if hasattr(forma.part, "slide") else None
        except Exception:  # noqa: BLE001
            lay = None
        if lay is not None:
            ph = next((x for x in lay.placeholders if x.placeholder_format.idx == forma.placeholder_format.idx), None)
            if ph is not None:
                d = ph._element.find(".//p:txBody/a:lstStyle/a:lvl1pPr/a:defRPr", NS)
                if d is not None:
                    fontes.append(d)
    for d in reversed(fontes):
        if d.get("sz"):
            p["tam"] = int(d.get("sz")) / 100
        if d.get("b") is not None:
            p["negrito"] = d.get("b") in ("1", "true")
        lat = d.find("a:latin", NS)
        if lat is not None and lat.get("typeface"):
            p["face"] = lat.get("typeface")
    return p


def estimar_altura(forma, deck: Deck, med: Medidor) -> tuple[float, float, bool] | None:
    """(altura necessária, altura disponível, palavra_cortada) em pontos; None se não se aplica.

    Caixa com "ajustar forma ao texto" (spAutoFit) cresce em vez de transbordar: o limite passa a ser a
    borda inferior do slide. Caixa com "reduzir texto" (normAutofit) não é estimada.
    """
    tx = forma._element.find(".//p:txBody", NS)
    if tx is None or forma.width is None or forma.height is None:
        return None
    body = tx.find("a:bodyPr", NS)
    if body is not None and body.find("a:normAutofit", NS) is not None:
        return None
    if body is not None and body.get("wrap") == "none":
        return None  # sem quebra de linha: a caixa não limita a largura
    ins = lambda k, d: int(body.get(k)) if body is not None and body.get(k) is not None else d  # noqa: E731
    larg = (forma.width - ins("lIns", 91440) - ins("rIns", 91440)) / EMU_POR_PT
    altura_caixa = forma.height
    if body is not None and body.find("a:spAutoFit", NS) is not None:
        altura_caixa = max(forma.height, deck.prs.slide_height - (forma.top or 0))
    alt = (altura_caixa - ins("tIns", 45720) - ins("bIns", 45720)) / EMU_POR_PT
    if larg <= 0:
        return None
    padrao = padrao_da_forma(forma, deck)
    total = 0.0
    cortada = False
    for p in tx.findall("a:p", NS):
        ppr = p.find("a:pPr", NS)
        mult = 1.0
        antes = depois = 0.0
        if ppr is not None:
            ln = ppr.find("a:lnSpc/a:spcPct", NS)
            if ln is not None:
                mult = int(ln.get("val")) / 100000
            sa = ppr.find("a:spcAft/a:spcPts", NS)
            if sa is not None:
                depois = int(sa.get("val")) / 100
            sb = ppr.find("a:spcBef/a:spcPts", NS)
            if sb is not None:
                antes = int(sb.get("val")) / 100
        # Palavras com a fonte de cada run; a:br força quebra.
        palavras: list[tuple[str, str, bool, float]] = []
        linhas_forcadas = 0
        tam_max_par = 0.0
        for el in p:
            nome = etree.QName(el).localname
            if nome == "r":
                face, neg, tam = propriedades_run(el, padrao, deck)
                tam_max_par = max(tam_max_par, tam)
                t = "".join(x.text or "" for x in el.findall("a:t", NS))
                for i, pedaco in enumerate(re.split(r"(\s+)", t)):
                    if pedaco and not pedaco.isspace():
                        palavras.append((pedaco, face, neg, tam))
                    elif pedaco:
                        palavras.append((" ", face, neg, tam))
            elif nome == "br":
                palavras.append(("\n", padrao["face"], padrao["negrito"], padrao["tam"]))
                linhas_forcadas += 1
        if not palavras:
            end = p.find("a:endParaRPr", NS)
            tam = int(end.get("sz")) / 100 if end is not None and end.get("sz") else padrao["tam"]
            total += med.altura_linha(deck.fonte_real(padrao["face"]), padrao["negrito"], tam) * mult + antes + depois
            continue
        linhas: list[float] = []
        x = 0.0
        alt_linha = 0.0
        espaco_pendente = 0.0
        for (w_txt, face, neg, tam) in palavras:
            h = med.altura_linha(face, neg, tam)
            if w_txt == "\n":
                linhas.append(alt_linha or h)
                x, alt_linha, espaco_pendente = 0.0, 0.0, 0.0
                continue
            if w_txt == " ":
                espaco_pendente += med.largura(" ", face, neg, tam)
                continue
            w = med.largura(w_txt, face, neg, tam)
            if w > larg + 0.5:
                cortada = True
            if x > 0 and x + espaco_pendente + w > larg + 0.5:
                linhas.append(alt_linha)
                x, alt_linha = w, h
            else:
                x += espaco_pendente + w
                alt_linha = max(alt_linha, h)
            espaco_pendente = 0.0
        linhas.append(alt_linha or med.altura_linha(face, neg, tam))
        total += sum(linhas) * mult + antes + depois
    return total, alt, cortada


# ------------------------------------------------------------------ números e datas

RE_NUMERO = re.compile(r"(?<![\w.,])[+\-−~≈]?\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\d])|(?<![\w.,])[+\-−~≈]?\d+(?:,\d+)?(?![\d])")
RE_UNIDADE = re.compile(r"\s*(%|pp\b|p\.p\.|mi\b|milh(?:ão|ões|oes|ao)\b|mil\b|bi\b|bilh(?:ão|ões|oes|ao)\b)", re.I)


def numeros(texto: str) -> list[tuple[float, int, str, str]]:
    """(valor, casas decimais, texto original, unidade) dos números do texto, sem anos."""
    out = []
    for m in RE_NUMERO.finditer(texto):
        bruto = m.group(0)
        limpo = bruto.lstrip("+-−~≈")
        if re.fullmatch(r"(19|20)\d\d", limpo):
            continue
        casas = len(limpo.split(",")[1]) if "," in limpo else 0
        valor = float(limpo.replace(".", "").replace(",", "."))
        u = RE_UNIDADE.match(texto, m.end())
        unidade = normalizar(u.group(1)) if u else ""
        unidade = {"milhao": "mi", "milhoes": "mi", "bilhao": "bi", "bilhoes": "bi", "p.p.": "pp"}.get(unidade, unidade)
        out.append((valor, casas, bruto, unidade))
    return out


def datas(texto: str) -> list[dt.date]:
    out = []
    n = normalizar(texto)
    for m in re.finditer(r"\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?\s*(?:/|de)\s*((?:19|20)\d\d)\b", n):
        out.append(dt.date(int(m.group(2)), MESES[m.group(1)], 1))
    for m in re.finditer(r"\b(0?[1-9]|1[0-2])/((?:19|20)\d\d)\b", n):
        out.append(dt.date(int(m.group(2)), int(m.group(1)), 1))
    sem_mes = re.sub(r"\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?\s*(?:/|de)\s*(19|20)\d\d\b", " ", n)
    for m in re.finditer(r"\b((?:19|20)\d\d)\b", sem_mes):
        out.append(dt.date(int(m.group(1)), 12, 1))  # ano sem mês: assume o fim do ano (favorece a fonte)
    return out


def data_briefing(v) -> dt.date | None:
    if isinstance(v, dt.date):
        return v
    if isinstance(v, str):
        m = re.match(r"((?:19|20)\d\d)-(\d\d)", v)
        if m:
            return dt.date(int(m.group(1)), int(m.group(2)), 1)
    return None


def meses_entre(a: dt.date, b: dt.date) -> int:
    return (b.year - a.year) * 12 + (b.month - a.month)


# ------------------------------------------------------------------ checagens

@dataclass
class Contexto:
    deck: Deck
    res: Resultado
    briefing: dict
    marca: Marca | None
    medidor: Medidor | None
    fontes_json: list | None
    relatorio: str | None
    roteiro: str | None
    responsavel: str | None
    sem_valores: bool
    textos: list[list[Texto]] = field(default_factory=list)
    imgs: list[Imagem] = field(default_factory=list)


def visivel(ctx: Contexto, i: int, *excluir: str) -> str:
    return "\n".join(t.texto for t in ctx.textos[i] if t.papel not in ("numero_slide", *excluir))


def checar_marca(ctx: Contexto) -> None:
    d, res = ctx.deck, ctx.res
    extras = {c.upper() for c in ctx.briefing.get("cores_extra_aprovadas") or []}
    fontes_extra = {normalizar(f) for f in (ctx.briefing.get("fontes_extra_aprovadas") or [])} \
        if ctx.briefing.get("identidade") == "material-fonte" else set()

    def partes_do_slide(s):
        els = [s._element]
        for f in formas(s.shapes):
            if getattr(f, "has_chart", False) and f.has_chart:
                els.append(f.chart._chartSpace)
        return els

    alvos = [(i + 1, partes_do_slide(s)) for i, s in enumerate(d.slides)]
    alvos += [(None, [lay._element]) for lay in d.prs.slide_layouts]
    alvos.append((None, [d.prs.slide_master._element]))
    vistos_m1, vistos_m2 = set(), set()
    for n, els in alvos:
        for el in els:
            for lat in el.iter(f"{{{NS['a']}}}latin"):
                face = lat.get("typeface", "")
                if not face or face.startswith("+"):
                    continue
                nf = normalizar(face)
                if not nf.startswith(FONTES_PERMITIDAS) and nf not in fontes_extra and (n, face) not in vistos_m1:
                    vistos_m1.add((n, face))
                    res.falha("M1", n, f'fonte "{face}" fora de Neo Sans Pro / Montserrat')
            for c in d.cores_em(el):
                if c not in PALETA and c not in extras and (n, c) not in vistos_m2:
                    vistos_m2.add((n, c))
                    res.falha("M2", n, f"cor #{c} fora da paleta do manual")
    for c in sorted(set(d.tema.values())):
        if c not in PALETA and c not in extras:
            res.falha("M2", None, f"tema do arquivo usa a cor #{c}, fora da paleta (rode lib/apply_theme.js)")

    # M3 formas proibidas; M4 logo em texto
    for n, els in alvos:
        raiz = els[0]
        for sp in raiz.iter(f"{{{NS['p']}}}sp"):
            nome = (sp.find(".//p:cNvPr", NS).get("name") or "") if sp.find(".//p:cNvPr", NS) is not None else ""
            geom = sp.find(".//a:prstGeom", NS)
            if geom is not None and geom.get("prst") in FORMAS_PROIBIDAS:
                res.falha("M3", n, f'forma "{geom.get("prst")}" ({nome}) fora do sistema de blocos do manual')
            if sp.find(".//a:custGeom", NS) is not None and "bloco" not in normalizar(nome):
                res.falha("M3", n, f'forma livre "{nome}" fora do sistema de blocos do manual')
            t = " ".join(x.text or "" for x in sp.iter(f"{{{NS['a']}}}t"))
            if re.sub(r"[^a-z ]", "", normalizar(t)).strip() in ("brain", "brain inteligencia estrategica"):
                res.falha("M4", n, f'logo escrita em texto ("{t.strip()}"); use a imagem oficial')

    # M5/M6 logos
    if ctx.marca is None:
        res.pular("M5", "pasta de marca indisponível")
        res.pular("M6", "pasta de marca indisponível")
    else:
        for img in ctx.imgs:
            if img.tipo != "logo":
                continue
            onde = img.slide if img.slide else None
            rotulo = f'layout "{img.layout}"' if img.layout else f"slide {img.slide}"
            if img.logo["tagline"] and img.w < 2.0:
                res.falha("M5", onde, f"logo com tagline com {img.w:.2f}″ de largura ({rotulo}); abaixo de 2″ use a versão sem tagline")
            with Image.open(io.BytesIO(img.blob)) as im:
                prop_img = im.width / im.height
            src = img.elemento.find(".//a:srcRect", NS)
            if src is not None:
                l, r = int(src.get("l", 0)), int(src.get("r", 0))
                t, b = int(src.get("t", 0)), int(src.get("b", 0))
                prop_img *= (1 - (l + r) / 100000) / max(1e-6, (1 - (t + b) / 100000))
            if abs((img.w / img.h) / prop_img - 1) > 0.02:
                res.falha("M6", onde, f"logo distorcida ({rotulo}): proporção {img.w / img.h:.3f} × original {prop_img:.3f}")
            fundo_cor = cor_sob(d, img)
            if fundo_cor:
                escuro = luminancia(fundo_cor) < 0.35
                if escuro and not img.logo["negativa"]:
                    res.falha("M6", onde, f"logo positiva sobre fundo escuro #{fundo_cor} ({rotulo}); use a versão Branco")
                if not escuro and img.logo["negativa"]:
                    res.falha("M6", onde, f"logo negativa (branca) sobre fundo claro #{fundo_cor} ({rotulo})")

    # M7 tons por slide; M8 uso da Neo Sans
    for i, s in enumerate(d.slides):
        fam = set()
        for el in partes_do_slide(s):
            fam |= {PALETA.get(c, c) for c in d.cores_em(el)}
        bg = fundo(d, s._element, s.slide_layout._element, s.slide_layout.slide_master._element)
        if bg:
            fam.add(PALETA.get(bg, bg))
        fam -= {"neutro"}
        if len(fam) > 2:
            res.alerta("M7", i + 1, f"{len(fam)} tons de cor no slide ({', '.join(sorted(fam))}); o manual pede no máximo 2")
        for t in ctx.textos[i]:
            f = t.forma
            if not f.has_text_frame:
                continue
            padrao = padrao_da_forma(f, d)
            for r in f._element.iter(f"{{{NS['a']}}}r"):
                face, _, _ = propriedades_run(r, padrao, d)
                txt = "".join(x.text or "" for x in r.findall("a:t", NS)).strip()
                if not txt or not normalizar(face).startswith("neo sans"):
                    continue
                if t.papel == "titulo":
                    if txt != txt.upper():
                        res.alerta("M8", i + 1, f'título em Neo Sans fora de caixa alta: "{txt[:60]}"')
                elif not (re.match(r"^([+\-−~≈]|R\$|\d)", txt) and len(txt.split()) <= 4):
                    res.alerta("M8", i + 1, f'Neo Sans fora do título e dos números de destaque: "{txt[:60]}"')


def checar_texto(ctx: Contexto) -> None:
    d, res, b = ctx.deck, ctx.res, ctx.briefing
    palco = (b.get("uso_do_deck") or "palco") == "palco"
    tecnico = b.get("nivel_conhecimento") == "especialista"
    siglas_vistas: dict[str, bool] = {}
    texto_anterior = ""
    for i, s in enumerate(d.slides):
        n = i + 1
        tx = visivel(ctx, i)
        norm = normalizar(tx)
        nota = notas(s)
        for pad in T4_PROIBIDOS:
            if (m := re.search(pad, norm)):
                res.falha("T4", n, f'termo proibido: "{m.group(0)}"')
        for pad in T5_AUDITORIA:
            if (m := re.search(pad, norm)):
                res.falha("T5", n, f'frase de auditoria no slide: "{m.group(0)}"')
        for pad in T6_REVISAO:
            if (m := re.search(pad, norm)):
                res.falha("T6", n, f'nota de revisão no slide: "{m.group(0)}" (pendências vão para as notas como [PENDENTE])')
        for pad in T6_REVISAO_SENSIVEL:
            if (m := re.search(pad, tx)):
                res.falha("T6", n, f'nota de revisão no slide: "{m.group(0)}"')
        for pad in T7_PLACEHOLDER:
            if (m := re.search(pad, norm)):
                res.falha("T7", n, f'placeholder no slide: "{m.group(0)}"')
        for pad in T10_VETADAS:
            for alvo, onde in ((norm, "slide"), (normalizar(nota), "notas do orador")):
                if (m := re.search(pad, alvo)):
                    res.falha("T10", n, f'expressão vetada pelo manual ({onde}): "{m.group(0)}"')
        for t in ctx.textos[i]:
            if t.papel == "titulo":
                palavras = len(t.texto.split())
                if palavras > 14:
                    res.alerta("T2", n, f"título com {palavras} palavras (máx. 14)")
                if t.texto.rstrip().endswith(".") and not t.texto.rstrip().endswith("..."):
                    res.alerta("T9", n, "título terminando em ponto final")
        if palco and s.slide_layout.name not in ("Capa", "Divisor", "SlideFinal"):
            corpo = visivel(ctx, i, "titulo", "etiqueta", "apoio", "sub", "fonte", "numero")
            k = len(re.findall(r"\w+", corpo))
            if k > 40:
                res.alerta("T3", n, f"{k} palavras no corpo de um slide de palco (referência: até ~40) [calibrar]")
        if not tecnico:
            for sigla, extenso in SIGLAS.items():
                if sigla in siglas_vistas or not re.search(rf"\b{sigla}\b", tx):
                    continue
                siglas_vistas[sigla] = True
                if extenso not in normalizar(texto_anterior + "\n" + tx):
                    res.alerta("T11", n, f"sigla {sigla} sem o nome por extenso na primeira ocorrência")
            for pad in ANGLICISMOS:
                if (m := re.search(pad, norm)):
                    res.alerta("T11", n, f'estrangeirismo evitável: "{m.group(0)}"')
        texto_anterior += "\n" + tx
    if ctx.roteiro:
        rn = normalizar(ctx.roteiro)
        for pad in T10_VETADAS:
            if (m := re.search(pad, rn)):
                res.falha("T10", None, f'expressão vetada pelo manual no roteiro: "{m.group(0)}"')

    # T1 transbordamento (estimado)
    if ctx.medidor is None:
        res.pular("T1", "fontes Neo Sans Pro/Montserrat indisponíveis para medir o texto")
    else:
        for i in range(len(d.slides)):
            for t in ctx.textos[i]:
                if t.papel in ("tabela", "numero_slide") or not t.forma.has_text_frame:
                    continue
                r = estimar_altura(t.forma, d, ctx.medidor)
                if r is None:
                    continue
                precisa, cabe, cortada = r
                if precisa > cabe * 1.05 + 1:
                    res.falha("T1", i + 1, f'texto transborda a caixa ({precisa:.0f} pt para {cabe:.0f} pt): "{t.texto.strip()[:50]}"')
                elif cortada:
                    res.falha("T1", i + 1, f'palavra mais larga que a caixa: "{t.texto.strip()[:50]}"')

    # T8 ortografia
    hun = shutil.which("hunspell")
    if not hun:
        res.pular("T8", "hunspell indisponível")
    else:
        for i in range(len(d.slides)):
            palavras = sorted({w for w in re.findall(r"[A-Za-zÀ-ÿ]{3,}", visivel(ctx, i))
                               if not w[0].isupper() and normalizar(w) not in GLOSSARIO})
            if not palavras:
                continue
            try:
                r = subprocess.run([hun, "-d", "pt_BR", "-l"], input="\n".join(palavras), capture_output=True, text=True, timeout=30)
            except (OSError, subprocess.TimeoutExpired):
                res.pular("T8", "hunspell falhou")
                break
            if r.returncode != 0 and not r.stdout:
                res.pular("T8", f"hunspell pt_BR indisponível: {r.stderr.strip()[:80]}")
                break
            erradas = sorted(set(r.stdout.split()))
            if erradas:
                res.alerta("T8", i + 1, "possíveis erros de ortografia: " + ", ".join(erradas[:10]))


def checar_dados(ctx: Contexto) -> None:
    d, res, b = ctx.deck, ctx.res, ctx.briefing
    estruturais = {"etiqueta", "numero", "numero_slide", "fonte"}
    for i, s in enumerate(d.slides):
        n = i + 1
        if s.slide_layout.name in ("Capa", "Divisor", "SlideFinal"):
            continue
        tem_grafico = any(getattr(f, "has_chart", False) and f.has_chart for f in formas(s.shapes)) or \
            any(t.papel == "tabela" for t in ctx.textos[i])
        tem_numero = any(numeros(t.texto) for t in ctx.textos[i]
                         if t.papel not in estruturais and not re.fullmatch(r"\s*\d{1,2}\s*", t.texto))
        tem_fonte = any(t.papel == "fonte" or re.match(r"^\s*fontes?\s*:", t.texto, re.I) for t in ctx.textos[i])
        if (tem_grafico or tem_numero) and not tem_fonte:
            res.falha("D1", n, "slide com número ou gráfico sem rodapé de fonte")

    # D2 números × fontes.json (ALERTA até calibrar)
    if ctx.fontes_json is None:
        res.pular("D2", "trabalho/fontes.json não informado")
    else:
        conhecidos = []
        for f in ctx.fontes_json:
            conhecidos += [v for v, *_ in numeros(str(f.get("valor", "")))]
        derivados = []
        if ctx.relatorio:
            sec = re.search(r"^#+[^\n]*derivad[^\n]*\n(.*?)(?=^#|\Z)", ctx.relatorio, re.M | re.S | re.I)
            if sec:
                derivados = [v for v, *_ in numeros(sec.group(1))]

        def confere(v, casas, base):
            return any(abs(round(x, casas) - v) < 10 ** -(casas + 1) or abs(x - v) < 1e-9 for x in base)

        for i in range(len(d.slides)):
            soltos = []
            for t in ctx.textos[i]:
                if t.papel in estruturais or re.fullmatch(r"\s*\d{1,2}\s*", t.texto):
                    continue
                for v, casas, bruto, _ in numeros(t.texto):
                    if not confere(v, casas, conhecidos) and not confere(v, casas, derivados) and bruto not in soltos:
                        soltos.append(bruto)
            if soltos:
                res.alerta("D2", i + 1, "números ausentes de fontes.json: " + ", ".join(soltos[:8]))
        por_indicador: dict[str, set] = {}
        for f in ctx.fontes_json:
            por_indicador.setdefault(normalizar(str(f.get("indicador", ""))), set()).add(str(f.get("valor", "")).strip())
        for ind, vals in por_indicador.items():
            if ind and len(vals) > 1:
                res.alerta("D4", None, f'indicador "{ind}" com valores diferentes em fontes.json: {", ".join(sorted(vals))}')

    # D4 no deck: mesmo número com grafias que não são arredondamento uma da outra (ex.: 588 mil × 589,0 mil).
    # Só valores a até 0,5% um do outro: acima disso são, quase sempre, indicadores diferentes (6,1 mi × 6,2 mi).
    vistos: list[tuple[float, int, str, str, int]] = []
    avisados = set()
    for i in range(len(d.slides)):
        for t in ctx.textos[i]:
            if t.papel in estruturais:
                continue
            for v, casas, bruto, uni in numeros(t.texto):
                if not uni or v == 0:
                    continue
                for (v2, c2, b2, u2, n2) in vistos:
                    if u2 != uni or v2 == v or abs(v - v2) / max(abs(v), abs(v2)) > 0.005:
                        continue
                    mais, menos = ((v, casas), (v2, c2)) if casas >= c2 else ((v2, c2), (v, casas))
                    if abs(round(mais[0], menos[1]) - menos[0]) < 10 ** -(menos[1] + 1):
                        continue
                    chave = tuple(sorted((bruto, b2)))
                    if chave not in avisados:
                        avisados.add(chave)
                        res.alerta("D4", i + 1, f'mesmo indicador com valores diferentes? "{b2} {u2}" (slide {n2}) × "{bruto} {uni}"')
                vistos.append((v, casas, bruto, uni, i + 1))

    # D3 / D5 atualidade das fontes
    corte = data_briefing(b.get("data_corte_dados"))
    evento = data_briefing(b.get("data"))
    if not corte:
        res.pular("D3", "briefing sem data_corte_dados")
    if not evento:
        res.pular("D5", "briefing sem data do evento")
    if corte or evento:
        for i, s in enumerate(d.slides):
            fontes_txt = " ".join(t.texto for t in ctx.textos[i] if t.papel == "fonte")
            ds = datas(fontes_txt)
            if not ds:
                continue
            ultima = max(ds)
            if corte and ultima < dt.date(corte.year, corte.month, 1):
                res.alerta("D3", i + 1, f"fonte mais recente ({ultima:%m/%Y}) anterior à data de corte ({corte:%m/%Y})")
            if evento and meses_entre(ultima, evento) > 12:
                sinalizado = "atualizado" in normalizar(visivel(ctx, i)) or "[pendente]" in normalizar(notas(s))
                if not sinalizado:
                    res.alerta("D5", i + 1, f"fonte de {ultima:%m/%Y}, mais de 12 meses antes do evento, sem \"atualizado\" nem [PENDENTE]")


def checar_entrega(ctx: Contexto) -> None:
    d, res, b = ctx.deck, ctx.res, ctx.briefing
    total = len(d.slides)
    # E1 capa × briefing
    campos = {k: b.get(k) for k in ("evento_nome_oficial", "cidade", "palestrante", "cargo") if b.get(k)}
    if not b:
        res.pular("E1", "briefing não informado")
    elif total:
        capa = normalizar(visivel(ctx, 0))
        capa_sp = re.sub(r"\s+", " ", capa)
        for k, v in campos.items():
            partes = [p.strip() for p in normalizar(str(v)).split("·") if p.strip()]
            if not all(re.sub(r"\s+", " ", p) in capa_sp for p in partes):
                res.falha("E1", 1, f'capa não traz o {k.replace("_", " ")} do briefing: "{v}"')
        ev = data_briefing(b.get("data"))
        if ev:
            mes = [nome for nome, nmes in MESES_EXTENSO.items() if nmes == ev.month][0]
            formatos = [f"{mes} de {ev.year}", f"{mes[:3]}/{ev.year}", f"{ev.month:02d}/{ev.year}", f"{ev.month}/{ev.year}", f"/{ev.month:02d}/{ev.year}"]
            if not any(f in capa_sp for f in formatos):
                res.falha("E1", 1, f"capa não traz a data do evento ({ev:%m/%Y})")
    # E2 QR code
    url = ((b.get("entregaveis") or {}).get("qr_code_url") or "").strip()
    if url and url not in ("https://...", "http://..."):
        if not any(img.tipo == "qr" and img.slide for img in ctx.imgs) and url not in "".join(
                etree.tostring(s.part._element, encoding="unicode") for s in d.slides):
            res.falha("E2", None, "briefing prevê QR code e nenhum slide traz o QR")
    # E3 slide final
    resp = b.get("responsavel") or ctx.responsavel
    coap = [c for c in (b.get("coapresentadores") or []) if c in ("fabio", "guilherme", "finoti")]
    if ctx.marca is None:
        res.pular("E3", "pasta de marca indisponível")
    elif total:
        def finais_do_slide(k):
            return [img.responsavel for img in ctx.imgs
                    if img.slide == k and img.tipo == "final" and img.w >= 13 and img.h >= 7.3]
        if resp == "outro":
            if "contato@brain.srv.br" not in visivel(ctx, total - 1):
                res.falha("E3", total, "responsável sem slide final próprio: o último slide deve ser o de contato institucional")
        else:
            esperados = [c for c in coap if c != resp] + ([resp] if resp else [])
            k = max(1, len(esperados))
            encontrados = [r for j in range(total - k + 1, total + 1) for r in finais_do_slide(j)]
            if not esperados:
                if not encontrados:
                    res.falha("E3", total, "o último slide não é um slide final de consultor (imagem oficial, tela cheia)")
                res.pular("E3", "responsável não informado: conferido só que há um slide final oficial")
            elif sorted(encontrados) != sorted(esperados):
                res.falha("E3", total, f"slide(s) final(is) {encontrados or 'ausente'}; esperado: {esperados} (imagem oficial, sem alteração)")
    # V1 versão sem valores
    if ctx.sem_valores:
        for i in range(total):
            if "R$" in visivel(ctx, i):
                res.falha("V1", i + 1, "valor em R$ numa versão sem valores")
    # F1 contagem de slides
    meta = b.get("meta_slides") or b.get("tempo_fala_min")
    if meta:
        if abs(total - meta) > 0.2 * meta:
            res.alerta("F1", None, f"{total} slides para uma meta de ~{meta} (±20%)")
    else:
        res.pular("F1", "briefing sem meta_slides nem tempo_fala_min")
    # F2 resolução; F5 crédito de foto
    for img in ctx.imgs:
        if img.tipo != "foto" or not img.slide:
            continue
        with Image.open(io.BytesIO(img.blob)) as im:
            dpi = im.width / max(img.w, 0.01)
        if dpi < 150:
            res.alerta("F2", img.slide, f'imagem "{img.nome}" com {dpi:.0f} dpi (mín. 150)')
        if not re.search(r"\b(imagem|imagens|foto|fotos)\s*:", normalizar(visivel(ctx, img.slide - 1))):
            res.alerta("F5", img.slide, f'imagem "{img.nome}" sem crédito ("Imagem: …")')
    # F3 slide vazio; F4 notas
    for i, s in enumerate(d.slides):
        tem_conteudo = visivel(ctx, i).strip() or any(img.slide == i + 1 for img in ctx.imgs) or \
            any(getattr(f, "has_chart", False) and f.has_chart for f in formas(s.shapes))
        if not tem_conteudo:
            res.falha("F3", i + 1, "slide vazio")
        if not notas(s).strip():
            res.alerta("F4", i + 1, "slide sem notas do orador")


def lint(caminho: Path, *, briefing: dict | None = None, marca: Path | None = None, dir_fontes: Path | None = None,
         fontes_json: list | None = None, relatorio: str | None = None, roteiro: str | None = None,
         responsavel: str | None = None, sem_valores: bool = False) -> dict:
    deck = Deck(caminho)
    res = Resultado(arquivo=caminho.name, slides=len(deck.slides))
    m = None
    if marca and (marca / "logos").is_dir():
        m = Marca(marca)
    med = None
    if dir_fontes and dir_fontes.is_dir():
        try:
            med = Medidor(dir_fontes)
        except FileNotFoundError:
            med = None
    ctx = Contexto(deck, res, briefing or {}, m, med, fontes_json, relatorio, roteiro, responsavel, sem_valores)
    ctx.textos = [textos_do_slide(deck, i) for i in range(len(deck.slides))]
    ctx.imgs = imagens(deck, m)
    checar_marca(ctx)
    checar_texto(ctx)
    checar_dados(ctx)
    checar_entrega(ctx)
    return res.json()


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Checagens automáticas do deck Brain (doc 05 §1)")
    ap.add_argument("pptx", type=Path)
    ap.add_argument("--saida", type=Path, help="grava o qa.json neste caminho")
    ap.add_argument("--briefing", type=Path)
    ap.add_argument("--fontes", type=Path, help="trabalho/fontes.json")
    ap.add_argument("--relatorio", type=Path)
    ap.add_argument("--roteiro", type=Path)
    ap.add_argument("--responsavel", choices=["fabio", "guilherme", "finoti", "outro"])
    ap.add_argument("--sem-valores", action="store_true")
    ap.add_argument("--marca", type=Path, default=Path("/app/marca"))
    ap.add_argument("--dir-fontes", type=Path, default=Path("/usr/local/share/fonts/brain"))
    a = ap.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if not a.pptx.is_file():
        print(f"arquivo não encontrado: {a.pptx}", file=sys.stderr)
        return 2
    briefing = None
    if a.briefing:
        import yaml
        briefing = yaml.safe_load(a.briefing.read_text(encoding="utf-8")) or {}
    fontes_json = None
    if a.fontes and a.fontes.is_file():
        bruto = json.loads(a.fontes.read_text(encoding="utf-8"))
        fontes_json = bruto if isinstance(bruto, list) else bruto.get("fontes", [])
    ler = lambda p: p.read_text(encoding="utf-8") if p and p.is_file() else None  # noqa: E731
    r = lint(a.pptx, briefing=briefing, marca=a.marca, dir_fontes=a.dir_fontes, fontes_json=fontes_json,
             relatorio=ler(a.relatorio), roteiro=ler(a.roteiro), responsavel=a.responsavel, sem_valores=a.sem_valores)
    texto = json.dumps(r, ensure_ascii=False, indent=1)
    if a.saida:
        a.saida.parent.mkdir(parents=True, exist_ok=True)
        a.saida.write_text(texto, encoding="utf-8")
    for it in r["itens"]:
        marca_ = "🔒" if it["nivel"] == "FALHA" else "⚠"
        print(f'{marca_} {it["id"]} slide {it["slide"] or "-"}: {it["mensagem"]}')
    for nv in r["nao_verificado"]:
        print(f'… {nv["id"]} não verificado: {nv["motivo"]}')
    print(f'{r["falhas_bloqueantes"]} falha(s) 🔒, {r["alertas"]} alerta(s) em {r["slides"]} slides')
    return 1 if r["falhas_bloqueantes"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
