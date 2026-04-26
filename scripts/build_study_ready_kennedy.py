#!/usr/bin/env python3
"""
Build study-ready static package for Curitiba analysis.

Inputs (defaults):
- assets/Curitiba_6 Min_Av Kennedy.kmz
- assets/relatorio_areas_selecionadas_.xlsx (sheet "tipologias")
- public/data/pof_setores_2026/4106902.geojson

Outputs:
- public/data/study/current/default_area.geojson
- public/data/study/current/empreendimentos.geojson
- public/data/study/current/tipologias_index.json
- public/data/study/current/sector_index.json
- public/data/study/current/default_socio_summary.json
- public/data/study/current/metadata.json
"""

from __future__ import annotations

import argparse
import json
import shutil
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
import xml.etree.ElementTree as ET

KML_NS = {"k": "http://www.opengis.net/kml/2.2"}
XLS_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XLS_NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XLS_NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships"


def parse_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return None
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def col_to_index(col: str) -> int:
    number = 0
    for char in col:
        if not char.isalpha():
            break
        number = number * 26 + (ord(char.upper()) - ord("A") + 1)
    return number


def split_cell_ref(ref: str) -> Tuple[int, int]:
    letters = "".join(ch for ch in ref if ch.isalpha())
    digits = "".join(ch for ch in ref if ch.isdigit())
    return col_to_index(letters), int(digits or 0)


def point_in_ring(lon: float, lat: float, ring: Sequence[Tuple[float, float]]) -> bool:
    inside = False
    size = len(ring)
    if size < 3:
        return False

    for i in range(size):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % size]
        intersects = (y1 > lat) != (y2 > lat)
        if intersects:
            x_intersect = (x2 - x1) * (lat - y1) / ((y2 - y1) + 1e-15) + x1
            if lon < x_intersect:
                inside = not inside
    return inside


def point_in_polygon_with_holes(
    lon: float, lat: float, rings: Sequence[Sequence[Tuple[float, float]]]
) -> bool:
    if not rings:
        return False
    if not point_in_ring(lon, lat, rings[0]):
        return False
    for hole in rings[1:]:
        if point_in_ring(lon, lat, hole):
            return False
    return True


def centroid_of_ring(ring: Sequence[Tuple[float, float]]) -> Tuple[float, float]:
    if len(ring) < 3:
        return ring[0] if ring else (0.0, 0.0)

    # Shoelace centroid
    area2 = 0.0
    cx = 0.0
    cy = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        cross = x1 * y2 - x2 * y1
        area2 += cross
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross

    if abs(area2) < 1e-12:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return (sum(xs) / len(xs), sum(ys) / len(ys))

    area = area2 / 2.0
    return (cx / (6.0 * area), cy / (6.0 * area))


def representative_point_from_geometry(geometry: Dict[str, Any]) -> Tuple[float, float]:
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if not coords:
        return (0.0, 0.0)

    if gtype == "Point":
        return (float(coords[0]), float(coords[1]))

    if gtype == "Polygon":
        ring = [(float(x), float(y)) for x, y in coords[0]]
        return centroid_of_ring(ring)

    if gtype == "MultiPolygon":
        best_ring: List[Tuple[float, float]] = []
        best_size = -1
        for polygon in coords:
            if not polygon:
                continue
            ring = [(float(x), float(y)) for x, y in polygon[0]]
            if len(ring) > best_size:
                best_ring = ring
                best_size = len(ring)
        if best_ring:
            return centroid_of_ring(best_ring)

    # Fallback for LineString/MultiLineString/etc
    flat_points: List[Tuple[float, float]] = []

    def walk(node: Any) -> None:
        if isinstance(node, (list, tuple)):
            if len(node) >= 2 and isinstance(node[0], (int, float)) and isinstance(
                node[1], (int, float)
            ):
                flat_points.append((float(node[0]), float(node[1])))
            else:
                for item in node:
                    walk(item)

    walk(coords)
    if not flat_points:
        return (0.0, 0.0)
    lon = sum(p[0] for p in flat_points) / len(flat_points)
    lat = sum(p[1] for p in flat_points) / len(flat_points)
    return (lon, lat)


def parse_kmz_polygon(kmz_path: Path) -> List[Tuple[float, float]]:
    with zipfile.ZipFile(kmz_path, "r") as archive:
        kml_name = next(
            (name for name in archive.namelist() if name.lower().endswith(".kml")), None
        )
        if not kml_name:
            raise RuntimeError(f"KMZ sem KML interno: {kmz_path}")
        root = ET.fromstring(archive.read(kml_name))

    coordinates_text = root.findtext(
        ".//k:Polygon//k:coordinates", default="", namespaces=KML_NS
    ).strip()
    if not coordinates_text:
        raise RuntimeError(f"KMZ sem poligono legivel: {kmz_path}")

    points: List[Tuple[float, float]] = []
    for token in coordinates_text.split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        lon = float(parts[0])
        lat = float(parts[1])
        points.append((lon, lat))

    if len(points) < 3:
        raise RuntimeError(f"Poligono invalido no KMZ: {kmz_path}")

    if points[0] == points[-1]:
        points = points[:-1]

    return points


def polygon_to_feature_collection(ring: Sequence[Tuple[float, float]]) -> Dict[str, Any]:
    closed = list(ring) + [ring[0]]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "area_influencia_default"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[lon, lat] for lon, lat in closed]],
                },
            }
        ],
    }


def parse_xlsx_tipologias(xlsx_path: Path) -> List[Dict[int, str]]:
    with zipfile.ZipFile(xlsx_path, "r") as archive:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            sst = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for si in sst.findall(f"{{{XLS_NS}}}si"):
                text = "".join((t.text or "") for t in si.findall(f".//{{{XLS_NS}}}t"))
                shared_strings.append(text)

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rels.findall(f"{{{XLS_NS_PKG}}}Relationship")
        }

        sheet_target = ""
        for sheet in workbook.findall(f".//{{{XLS_NS}}}sheet"):
            if sheet.attrib.get("name") != "tipologias":
                continue
            rel_id = sheet.attrib.get(f"{{{XLS_NS_REL}}}id")
            if rel_id and rel_id in rel_map:
                sheet_target = "xl/" + rel_map[rel_id]
                break

        if not sheet_target:
            raise RuntimeError(f"Aba 'tipologias' nao encontrada em {xlsx_path}")

        xml = ET.fromstring(archive.read(sheet_target))
        rows = xml.findall(f".//{{{XLS_NS}}}sheetData/{{{XLS_NS}}}row")

        parsed: List[Dict[int, str]] = []
        for row in rows:
            values: Dict[int, str] = {}
            for cell in row.findall(f"{{{XLS_NS}}}c"):
                ref = cell.attrib.get("r", "")
                col_index, _ = split_cell_ref(ref)
                cell_type = cell.attrib.get("t")
                v = cell.find(f"{{{XLS_NS}}}v")
                is_node = cell.find(f"{{{XLS_NS}}}is")

                value = ""
                if cell_type == "s" and v is not None and v.text is not None:
                    idx = int(v.text)
                    value = shared_strings[idx] if 0 <= idx < len(shared_strings) else ""
                elif cell_type == "inlineStr" and is_node is not None:
                    t_node = is_node.find(f".//{{{XLS_NS}}}t")
                    value = (t_node.text if t_node is not None else "") or ""
                elif v is not None and v.text is not None:
                    value = v.text

                values[col_index] = value
            if values:
                parsed.append(values)
    return parsed


@dataclass
class EmpreendimentoAgg:
    empreendimento_id: str
    nome: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cidade: str = ""
    estado: str = ""
    bairro: str = ""
    endereco: str = ""
    numero: str = ""

    statuses: set[str] = field(default_factory=set)
    tipos: set[str] = field(default_factory=set)
    padroes: set[str] = field(default_factory=set)
    quartos: set[str] = field(default_factory=set)
    tipologias: set[str] = field(default_factory=set)

    oferta_lancada: Optional[float] = None
    oferta_final: Optional[float] = None
    vgv_total: Optional[float] = None
    vgv_oferta_final: Optional[float] = None

    rows_count: int = 0

    def merge_max(self, field_name: str, value: Optional[float]) -> None:
        if value is None:
            return
        current = getattr(self, field_name)
        if current is None or value > current:
            setattr(self, field_name, value)

    def to_feature(self, inside_default_area: bool) -> Dict[str, Any]:
        if self.latitude is None or self.longitude is None:
            raise RuntimeError(f"Empreendimento sem coordenada: {self.empreendimento_id}")

        properties = {
            "empreendimento_id": self.empreendimento_id,
            "empreendimento": self.nome,
            "cidade": self.cidade,
            "estado": self.estado,
            "bairro": self.bairro,
            "endereco": self.endereco,
            "numero": self.numero,
            "statuses": sorted(self.statuses),
            "tipos": sorted(self.tipos),
            "padroes": sorted(self.padroes),
            "quartos": sorted(self.quartos),
            "tipologias": sorted(self.tipologias),
            "tipologias_count": self.rows_count,
            "oferta_lancada": self.oferta_lancada,
            "oferta_final": self.oferta_final,
            "vgv_total": self.vgv_total,
            "vgv_oferta_final": self.vgv_oferta_final,
            "inside_default_area": inside_default_area,
        }
        return {
            "type": "Feature",
            "id": self.empreendimento_id,
            "properties": properties,
            "geometry": {"type": "Point", "coordinates": [self.longitude, self.latitude]},
        }


def build_empreendimentos_geojson(
    tipologias_rows: List[Dict[int, str]], default_polygon_rings: List[List[Tuple[float, float]]]
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    if not tipologias_rows:
        raise RuntimeError("Arquivo XLSX sem linhas na aba tipologias.")

    # First row is header
    data_rows = tipologias_rows[1:]

    aggregators: Dict[str, EmpreendimentoAgg] = {}

    for row in data_rows:
        emp_id = clean_text(row.get(2))
        if not emp_id:
            continue

        agg = aggregators.get(emp_id)
        if not agg:
            agg = EmpreendimentoAgg(empreendimento_id=emp_id)
            aggregators[emp_id] = agg

        agg.rows_count += 1

        agg.nome = agg.nome or clean_text(row.get(4))
        agg.cidade = agg.cidade or clean_text(row.get(12))
        agg.estado = agg.estado or clean_text(row.get(13))
        agg.bairro = agg.bairro or clean_text(row.get(11))
        agg.endereco = agg.endereco or clean_text(row.get(9))
        agg.numero = agg.numero or clean_text(row.get(10))

        lat = parse_number(row.get(7))
        lon = parse_number(row.get(8))
        if agg.latitude is None and lat is not None:
            agg.latitude = lat
        if agg.longitude is None and lon is not None:
            agg.longitude = lon

        status = clean_text(row.get(5))
        tipo = clean_text(row.get(6))
        padrao = clean_text(row.get(30))
        quartos = clean_text(row.get(22))
        tipologia = clean_text(row.get(31))

        if status:
            agg.statuses.add(status)
        if tipo:
            agg.tipos.add(tipo)
        if padrao:
            agg.padroes.add(padrao)
        if quartos:
            agg.quartos.add(quartos)
        if tipologia:
            agg.tipologias.add(tipologia)

        agg.merge_max("oferta_lancada", parse_number(row.get(18)))
        agg.merge_max("oferta_final", parse_number(row.get(19)))
        agg.merge_max("vgv_total", parse_number(row.get(20)))
        agg.merge_max("vgv_oferta_final", parse_number(row.get(21)))

    features: List[Dict[str, Any]] = []
    inside_count = 0

    for agg in aggregators.values():
        if agg.latitude is None or agg.longitude is None:
            continue
        inside = point_in_polygon_with_holes(
            agg.longitude, agg.latitude, default_polygon_rings
        )
        if inside:
            inside_count += 1
        features.append(agg.to_feature(inside))

    features.sort(key=lambda f: str(f.get("properties", {}).get("empreendimento", "")))

    metadata = {
        "empreendimentos_total": len(features),
        "empreendimentos_inside_default_area": inside_count,
    }
    return {"type": "FeatureCollection", "features": features}, metadata


def build_tipologias_index(
    tipologias_rows: List[Dict[int, str]], default_polygon_rings: List[List[Tuple[float, float]]]
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if not tipologias_rows:
        return [], {
            "tipologias_total": 0,
            "tipologias_inside_default_area": 0,
        }

    data_rows = tipologias_rows[1:]
    rows: List[Dict[str, Any]] = []
    inside_count = 0

    for row in data_rows:
        emp_id = clean_text(row.get(2))
        tip_id = clean_text(row.get(3))
        if not emp_id and not tip_id:
            continue

        lat = parse_number(row.get(7))
        lon = parse_number(row.get(8))

        inside = False
        if lat is not None and lon is not None:
            inside = point_in_polygon_with_holes(lon, lat, default_polygon_rings)
            if inside:
                inside_count += 1

        rows.append(
            {
                "empreendimento_id": emp_id,
                "tipologia_id": tip_id,
                "empreendimento": clean_text(row.get(4)),
                "status": clean_text(row.get(5)),
                "tipo": clean_text(row.get(6)),
                "latitude": lat,
                "longitude": lon,
                "endereco": clean_text(row.get(9)),
                "numero": clean_text(row.get(10)),
                "bairro": clean_text(row.get(11)),
                "cidade": clean_text(row.get(12)),
                "estado": clean_text(row.get(13)),
                "quartos": clean_text(row.get(22)),
                "unidades_tipologia": parse_number(row.get(24)),
                "oferta_final_tipologia": parse_number(row.get(25)),
                "preco_lancamento": parse_number(row.get(26)),
                "preco": parse_number(row.get(27)),
                "m2_priv": parse_number(row.get(28)),
                "valor_m2_priv": parse_number(row.get(29)),
                "padrao": clean_text(row.get(30)),
                "tipologia": clean_text(row.get(31)),
                "oferta_lancada_empreendimento": parse_number(row.get(18)),
                "oferta_final_empreendimento": parse_number(row.get(19)),
                "vgv_total": parse_number(row.get(20)),
                "vgv_oferta_final": parse_number(row.get(21)),
                "inside_default_area": inside,
            }
        )

    metadata = {
        "tipologias_total": len(rows),
        "tipologias_inside_default_area": inside_count,
    }
    return rows, metadata


def summarize_sector_values(
    sector_rows: Iterable[Dict[str, Any]], label: str
) -> Dict[str, Any]:
    sectors = list(sector_rows)
    if not sectors:
        return {
            "label": label,
            "sectors_count": 0,
            "domicilios_26_sum": 0.0,
            "pessoas_sum": 0.0,
            "renda_media_domicilio_ponderada": None,
            "renda_media_pessoa_ponderada": None,
            "alimentacao_dentro_sum": 0.0,
            "alimentacao_fora_sum": 0.0,
            "despesas_consumo_sum": 0.0,
        }

    domicilios_sum = 0.0
    pessoas_sum = 0.0
    aliment_dentro_sum = 0.0
    aliment_fora_sum = 0.0
    despesas_sum = 0.0

    renda_dom_weighted_sum = 0.0
    renda_dom_weight = 0.0
    renda_pessoa_weighted_sum = 0.0
    renda_pessoa_weight = 0.0

    for row in sectors:
        domicilios = parse_number(row.get("domicilios_26")) or 0.0
        pessoas = parse_number(row.get("nr_pessoas_v0001")) or 0.0
        renda_dom = parse_number(row.get("rend_mensal_por_domicilio2026"))
        renda_pessoa = parse_number(row.get("rend_mensal_por_pessoa2026"))

        domicilios_sum += domicilios
        pessoas_sum += pessoas
        aliment_dentro_sum += parse_number(row.get("total_alimentacao_dentro")) or 0.0
        aliment_fora_sum += parse_number(row.get("total_alimentacao_fora")) or 0.0
        despesas_sum += parse_number(row.get("total_despesas_consumo")) or 0.0

        if renda_dom is not None and domicilios > 0:
            renda_dom_weighted_sum += renda_dom * domicilios
            renda_dom_weight += domicilios
        if renda_pessoa is not None and pessoas > 0:
            renda_pessoa_weighted_sum += renda_pessoa * pessoas
            renda_pessoa_weight += pessoas

    return {
        "label": label,
        "sectors_count": len(sectors),
        "domicilios_26_sum": round(domicilios_sum, 3),
        "pessoas_sum": round(pessoas_sum, 3),
        "renda_media_domicilio_ponderada": round(renda_dom_weighted_sum / renda_dom_weight, 3)
        if renda_dom_weight > 0
        else None,
        "renda_media_pessoa_ponderada": round(
            renda_pessoa_weighted_sum / renda_pessoa_weight, 3
        )
        if renda_pessoa_weight > 0
        else None,
        "alimentacao_dentro_sum": round(aliment_dentro_sum, 3),
        "alimentacao_fora_sum": round(aliment_fora_sum, 3),
        "despesas_consumo_sum": round(despesas_sum, 3),
    }


def build_sector_index(
    setor_geojson_path: Path, default_polygon_rings: List[List[Tuple[float, float]]]
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    source = json.loads(setor_geojson_path.read_text(encoding="utf-8"))
    features = source.get("features") or []

    sector_index: List[Dict[str, Any]] = []
    inside_rows: List[Dict[str, Any]] = []

    for feature in features:
        geometry = feature.get("geometry") or {}
        props = feature.get("properties") or {}
        if not geometry:
            continue

        lon, lat = representative_point_from_geometry(geometry)
        row = {
            "cd_setor": clean_text(props.get("CD_SETOR") or props.get("cd_setor")),
            "centroid": [round(lon, 7), round(lat, 7)],
            "domicilios_26": parse_number(props.get("domicilios_26")),
            "nr_pessoas_v0001": parse_number(props.get("nr_pessoas_v0001")),
            "rend_mensal_por_domicilio2026": parse_number(
                props.get("rend_mensal_por_domicilio2026")
            ),
            "rend_mensal_por_pessoa2026": parse_number(
                props.get("rend_mensal_por_pessoa2026")
            ),
            "total_alimentacao_dentro": parse_number(props.get("total_alimentacao_dentro")),
            "total_alimentacao_fora": parse_number(props.get("total_alimentacao_fora")),
            "total_despesas_consumo": parse_number(props.get("total_despesas_consumo")),
            "total_habitacao": parse_number(props.get("total_habitacao")),
        }
        sector_index.append(row)

        if point_in_polygon_with_holes(lon, lat, default_polygon_rings):
            inside_rows.append(row)

    summary = summarize_sector_values(inside_rows, "default_area")
    summary["sectors_total"] = len(sector_index)
    summary["sectors_inside_default_area"] = len(inside_rows)
    return sector_index, summary


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), indent=2),
        encoding="utf-8",
    )


def default_path_by_glob(base: Path, pattern: str) -> Path:
    matches = sorted(base.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Nenhum arquivo encontrado para pattern: {pattern}")
    return matches[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build study-ready package for Curitiba.")
    parser.add_argument("--kmz", type=Path, help="Path do KMZ da area de influencia.")
    parser.add_argument("--xlsx", type=Path, help="Path do XLSX com aba tipologias.")
    parser.add_argument(
        "--setores",
        type=Path,
        help="Path do GeoJSON setorial POF (default: public/data/pof_setores_2026/4106902.geojson)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Diretorio de output (default: public/data/study/current)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    assets_dir = root / "assets"

    kmz_path = (args.kmz or default_path_by_glob(assets_dir, "*Av Kennedy.kmz")).resolve()
    xlsx_path = (args.xlsx or (assets_dir / "relatorio_areas_selecionadas_.xlsx")).resolve()
    setor_path = (
        args.setores
        or (root / "public" / "data" / "pof_setores_2026" / "4106902.geojson")
    ).resolve()
    output_dir = (args.output_dir or (root / "public" / "data" / "study" / "current")).resolve()

    if not kmz_path.exists():
        raise FileNotFoundError(f"KMZ nao encontrado: {kmz_path}")
    if not xlsx_path.exists():
        raise FileNotFoundError(f"XLSX nao encontrado: {xlsx_path}")
    if not setor_path.exists():
        raise FileNotFoundError(f"Setores POF nao encontrados: {setor_path}")

    print("Lendo poligono padrao...")
    default_ring = parse_kmz_polygon(kmz_path)
    default_area_fc = polygon_to_feature_collection(default_ring)
    default_polygon_rings = [default_ring]

    print("Lendo empreendimentos (XLSX/tipologias)...")
    tipologias_rows = parse_xlsx_tipologias(xlsx_path)
    empreendimentos_fc, empreendimentos_meta = build_empreendimentos_geojson(
        tipologias_rows, default_polygon_rings
    )
    tipologias_index, tipologias_meta = build_tipologias_index(
        tipologias_rows, default_polygon_rings
    )

    print("Lendo indice setorial POF...")
    sector_index, socio_summary = build_sector_index(setor_path, default_polygon_rings)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "default_area.geojson", default_area_fc)
    write_json(output_dir / "empreendimentos.geojson", empreendimentos_fc)
    write_json(output_dir / "tipologias_index.json", tipologias_index)
    write_json(output_dir / "sector_index.json", sector_index)
    write_json(output_dir / "default_socio_summary.json", socio_summary)

    # Keep original KMZ available for download/share in frontend.
    shutil.copy2(kmz_path, output_dir / kmz_path.name)

    metadata = {
        "version": 1,
        "default_area_name": "Area padrao importada",
        "input_files": {
            "kmz": kmz_path.name,
            "xlsx": xlsx_path.name,
            "setores": str(setor_path.relative_to(root)).replace("\\", "/"),
        },
        "counts": {
            **empreendimentos_meta,
            **tipologias_meta,
            "tipologias_rows_total": max(len(tipologias_rows) - 1, 0),
            "sectors_total": socio_summary.get("sectors_total", 0),
            "sectors_inside_default_area": socio_summary.get(
                "sectors_inside_default_area", 0
            ),
        },
        "files": {
            "default_area_geojson": "default_area.geojson",
            "empreendimentos_geojson": "empreendimentos.geojson",
            "tipologias_index_json": "tipologias_index.json",
            "sector_index_json": "sector_index.json",
            "default_socio_summary_json": "default_socio_summary.json",
            "default_area_kmz": kmz_path.name,
        },
    }
    write_json(output_dir / "metadata.json", metadata)

    print("Concluido.")
    print(f"Output: {output_dir}")
    print(
        f"Empreendimentos: {empreendimentos_meta['empreendimentos_total']} "
        f"(inside default: {empreendimentos_meta['empreendimentos_inside_default_area']})"
    )
    print(
        f"Tipologias: {tipologias_meta['tipologias_total']} "
        f"(inside default: {tipologias_meta['tipologias_inside_default_area']})"
    )
    print(
        f"Setores POF: {socio_summary.get('sectors_total', 0)} "
        f"(inside default: {socio_summary.get('sectors_inside_default_area', 0)})"
    )


if __name__ == "__main__":
    main()
