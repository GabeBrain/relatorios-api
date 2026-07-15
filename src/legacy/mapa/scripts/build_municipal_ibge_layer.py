#!/usr/bin/env python3
"""
Build a municipal socio-demographic layer:
- Geometry: IBGE municipal mesh (2024 shapefile)
- Indicators: aggregated from assets/Renda Média (Setor Censitário).csv

Output:
- public/data/ibge_municipios_2024_socio.geojson
"""

from __future__ import annotations

import argparse
import csv
import json
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

import shapefile


IBGE_ZIP_NAME = "BR_Municipios_2024.zip"
SETORES_CSV_NAME = "Renda Média (Setor Censitário).csv"


@dataclass
class AggMunicipio:
    sector_count: int = 0
    area_sum: float = 0.0
    pop_sum: float = 0.0
    dom_sum: float = 0.0
    renda_nominal_sum: float = 0.0
    pea_dia_sum: float = 0.0
    pop_trabalha_sum: float = 0.0
    potencial_consumo_sum: float = 0.0
    tgca_renda_weighted_sum: float = 0.0
    tgca_pop_weighted_sum: float = 0.0
    tgca_weight_pop_sum: float = 0.0

    def as_properties(self) -> Dict[str, float | int | None]:
        pop = self.pop_sum if self.pop_sum > 0 else None
        dom = self.dom_sum if self.dom_sum > 0 else None
        area = self.area_sum if self.area_sum > 0 else None

        renda_media = None
        if self.renda_nominal_sum > 0 and self.dom_sum > 0:
            renda_media = self.renda_nominal_sum / self.dom_sum

        densidade = None
        if self.pop_sum > 0 and self.area_sum > 0:
            densidade = self.pop_sum / self.area_sum

        tgca_renda = None
        tgca_pop = None
        if self.tgca_weight_pop_sum > 0:
            tgca_renda = self.tgca_renda_weighted_sum / self.tgca_weight_pop_sum
            tgca_pop = self.tgca_pop_weighted_sum / self.tgca_weight_pop_sum

        return {
            "sector_count": self.sector_count,
            "pop_total": round_or_none(pop, 3),
            "dom_total": round_or_none(dom, 3),
            "area_km2_assets": round_or_none(area, 6),
            "densidade_demo_assets": round_or_none(densidade, 6),
            "renda_media_domic_assets": round_or_none(renda_media, 3),
            "renda_nominal_total": round_or_none(
                self.renda_nominal_sum if self.renda_nominal_sum > 0 else None, 3
            ),
            "pea_dia_total": round_or_none(
                self.pea_dia_sum if self.pea_dia_sum > 0 else None, 3
            ),
            "pop_trabalha_total": round_or_none(
                self.pop_trabalha_sum if self.pop_trabalha_sum > 0 else None, 3
            ),
            "potencial_consumo_total": round_or_none(
                self.potencial_consumo_sum if self.potencial_consumo_sum > 0 else None,
                3,
            ),
            "tgca_renda_media_pct": round_or_none(tgca_renda, 6),
            "tgca_pop_pct": round_or_none(tgca_pop, 6),
        }


def round_or_none(value: float | None, ndigits: int) -> float | None:
    if value is None:
        return None
    return round(value, ndigits)


def parse_br_number(value: str) -> float | None:
    s = (value or "").strip()
    if not s:
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def normalize_name(value: str) -> str:
    raw = (value or "").strip().upper()
    normalized = "".join(
        ch for ch in unicodedata.normalize("NFKD", raw) if not unicodedata.combining(ch)
    )
    for old, new in (
        ("'", ""),
        ("`", ""),
        ("´", ""),
        ("-", " "),
        ("/", " "),
        (".", " "),
        (",", " "),
    ):
        normalized = normalized.replace(old, new)
    normalized = " ".join(normalized.split())
    return normalized


def signed_area(ring: Sequence[Tuple[float, float]]) -> float:
    area = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        area += (x1 * y2) - (x2 * y1)
    return area / 2.0


def perpendicular_distance(
    p: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]
) -> float:
    x, y = p
    x1, y1 = a
    x2, y2 = b
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    projx = x1 + t * dx
    projy = y1 + t * dy
    return ((x - projx) ** 2 + (y - projy) ** 2) ** 0.5


def douglas_peucker(
    points: Sequence[Tuple[float, float]], eps: float
) -> List[Tuple[float, float]]:
    n = len(points)
    if n <= 2:
        return list(points)

    keep = [False] * n
    keep[0] = True
    keep[-1] = True
    stack: List[Tuple[int, int]] = [(0, n - 1)]

    while stack:
        start, end = stack.pop()
        max_distance = -1.0
        index = -1
        a = points[start]
        b = points[end]
        for i in range(start + 1, end):
            distance = perpendicular_distance(points[i], a, b)
            if distance > max_distance:
                max_distance = distance
                index = i
        if index >= 0 and max_distance > eps:
            keep[index] = True
            stack.append((start, index))
            stack.append((index, end))

    return [pt for pt, marker in zip(points, keep) if marker]


def simplify_ring(
    ring: Sequence[Tuple[float, float]], eps: float
) -> List[Tuple[float, float]]:
    if len(ring) <= 4 or eps <= 0:
        return list(ring)

    closed = ring[0] == ring[-1]
    core = list(ring[:-1] if closed else ring)
    simplified = douglas_peucker(core, eps)
    if closed and simplified[0] != simplified[-1]:
        simplified.append(simplified[0])

    if closed and len(simplified) < 4:
        return list(ring[:4])
    return simplified


def shape_parts_to_rings(shape: shapefile.Shape) -> List[List[Tuple[float, float]]]:
    points = shape.points
    indexes = list(shape.parts) + [len(points)]
    rings: List[List[Tuple[float, float]]] = []
    for i in range(len(indexes) - 1):
        ring = [tuple(pt) for pt in points[indexes[i] : indexes[i + 1]]]
        if len(ring) >= 4:
            rings.append(ring)
    return rings


def rings_to_geojson_geometry(
    rings: Iterable[List[Tuple[float, float]]], eps: float, round_digits: int
) -> Dict[str, object] | None:
    polygons: List[List[List[Tuple[float, float]]]] = []
    current_polygon: List[List[Tuple[float, float]]] | None = None

    for original_ring in rings:
        ring = simplify_ring(original_ring, eps)
        if len(ring) < 4:
            continue

        if signed_area(ring) < 0:
            current_polygon = [ring]
            polygons.append(current_polygon)
        else:
            if current_polygon is None:
                current_polygon = [ring]
                polygons.append(current_polygon)
            else:
                current_polygon.append(ring)

    if not polygons:
        return None

    def round_ring(
        ring_pts: Sequence[Tuple[float, float]]
    ) -> List[List[float]]:
        return [[round(x, round_digits), round(y, round_digits)] for x, y in ring_pts]

    if len(polygons) == 1:
        return {
            "type": "Polygon",
            "coordinates": [round_ring(ring) for ring in polygons[0]],
        }

    return {
        "type": "MultiPolygon",
        "coordinates": [
            [
                [[round(x, round_digits), round(y, round_digits)] for x, y in ring]
                for ring in polygon
            ]
            for polygon in polygons
        ],
    }


def extract_zip_if_needed(zip_path: Path, extract_dir: Path) -> None:
    shp_path = extract_dir / "BR_Municipios_2024.shp"
    dbf_path = extract_dir / "BR_Municipios_2024.dbf"
    shx_path = extract_dir / "BR_Municipios_2024.shx"
    if shp_path.exists() and dbf_path.exists() and shx_path.exists():
        return
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as archive:
        archive.extractall(extract_dir)


def detect_shapefile_encoding(shp_path: Path) -> str:
    cpg_path = shp_path.with_suffix(".cpg")
    if cpg_path.exists():
        raw = cpg_path.read_text(encoding="utf-8", errors="ignore").strip()
        if raw:
            upper = raw.upper()
            if "UTF" in upper:
                return "utf-8"
            if "1252" in upper:
                return "cp1252"
            return raw
    return "utf-8"


def load_setor_aggregates(csv_path: Path) -> Dict[Tuple[str, str], AggMunicipio]:
    by_mun: Dict[Tuple[str, str], AggMunicipio] = {}

    with csv_path.open("r", encoding="cp1252", newline="") as f:
        reader = csv.reader(f, delimiter=";")
        next(reader, None)  # metadata line
        headers = next(reader, None)
        if not headers:
            raise RuntimeError("CSV de setores sem cabeçalho válido.")

        idx = {name: i for i, name in enumerate(headers)}

        def col(name: str) -> int:
            if name not in idx:
                raise KeyError(f"Coluna não encontrada no CSV de setores: {name}")
            return idx[name]

        i_mun = col("Município")
        i_uf = col("Estado")
        i_area = col("Área")
        i_pop = col("População")
        i_dom = col("Domicílios")
        i_renda_nom = col("Renda Nominal")
        i_pea = col("PEA Dia")
        i_pop_trab = col("População que Trabalha")
        i_pot = col("Potencial de Consumo")
        i_tgca_renda = col("TGCA Renda Média (%)")
        i_tgca_pop = col("TGCA População (%)")

        for row in reader:
            if len(row) < len(headers):
                continue

            municipio = row[i_mun].strip()
            uf = row[i_uf].strip().upper()
            if not municipio or not uf:
                continue

            key = (normalize_name(municipio), uf)
            agg = by_mun.get(key)
            if agg is None:
                agg = AggMunicipio()
                by_mun[key] = agg

            agg.sector_count += 1

            area = parse_br_number(row[i_area])
            pop = parse_br_number(row[i_pop])
            dom = parse_br_number(row[i_dom])
            renda_nom = parse_br_number(row[i_renda_nom])
            pea = parse_br_number(row[i_pea])
            pop_trab = parse_br_number(row[i_pop_trab])
            pot = parse_br_number(row[i_pot])
            tgca_renda = parse_br_number(row[i_tgca_renda])
            tgca_pop = parse_br_number(row[i_tgca_pop])

            if area is not None:
                agg.area_sum += area
            if pop is not None:
                agg.pop_sum += pop
            if dom is not None:
                agg.dom_sum += dom
            if renda_nom is not None:
                agg.renda_nominal_sum += renda_nom
            if pea is not None:
                agg.pea_dia_sum += pea
            if pop_trab is not None:
                agg.pop_trabalha_sum += pop_trab
            if pot is not None:
                agg.potencial_consumo_sum += pot

            if pop is not None and pop > 0:
                if tgca_renda is not None:
                    agg.tgca_renda_weighted_sum += tgca_renda * pop
                if tgca_pop is not None:
                    agg.tgca_pop_weighted_sum += tgca_pop * pop
                if tgca_renda is not None or tgca_pop is not None:
                    agg.tgca_weight_pop_sum += pop

    return by_mun


def build_layer(
    shp_path: Path,
    aggregates: Dict[Tuple[str, str], AggMunicipio],
    output_path: Path,
    simplify_epsilon: float,
    round_digits: int,
) -> Dict[str, int]:
    shp_encoding = detect_shapefile_encoding(shp_path)
    reader = shapefile.Reader(str(shp_path), encoding=shp_encoding)
    fields = [f[0] for f in reader.fields[1:]]

    features: List[Dict[str, object]] = []
    matched_keys: set[Tuple[str, str]] = set()
    unmatched_features = 0
    geometry_skipped = 0

    for rec, shape in zip(reader.records(), reader.shapes()):
        attrs = dict(zip(fields, rec))
        municipio = str(attrs.get("NM_MUN", "")).strip()
        uf = str(attrs.get("SIGLA_UF", "")).strip().upper()
        key = (normalize_name(municipio), uf)

        agg = aggregates.get(key)
        if agg:
            matched_keys.add(key)
            agg_props = agg.as_properties()
        else:
            agg_props = AggMunicipio().as_properties()
            unmatched_features += 1

        geometry = rings_to_geojson_geometry(
            shape_parts_to_rings(shape), simplify_epsilon, round_digits
        )
        if geometry is None:
            geometry_skipped += 1
            continue

        properties = {
            "CD_MUN": str(attrs.get("CD_MUN", "")).strip(),
            "NM_MUN": municipio,
            "SIGLA_UF": uf,
            "NM_UF": str(attrs.get("NM_UF", "")).strip(),
            "AREA_KM2_IBGE": attrs.get("AREA_KM2"),
            **agg_props,
        }

        features.append(
            {
                "type": "Feature",
                "id": properties["CD_MUN"],
                "properties": properties,
                "geometry": geometry,
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    feature_collection = {"type": "FeatureCollection", "features": features}
    output_path.write_text(
        json.dumps(feature_collection, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    unmatched_data = len(set(aggregates.keys()) - matched_keys)
    return {
        "features_out": len(features),
        "unmatched_geometry_to_data": unmatched_features,
        "unmatched_data_to_geometry": unmatched_data,
        "geometry_skipped": geometry_skipped,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--simplify-epsilon",
        type=float,
        default=0.001,
        help="Douglas-Peucker epsilon in degrees (default: 0.001)",
    )
    parser.add_argument(
        "--round-digits",
        type=int,
        default=6,
        help="Coordinate rounding digits (default: 6)",
    )
    parser.add_argument(
        "--ibge-zip",
        type=Path,
        default=None,
        help="Path to BR_Municipios_2024.zip (default: assets/_ibge_municipios_2024/BR_Municipios_2024.zip)",
    )
    parser.add_argument(
        "--setores-csv",
        type=Path,
        default=None,
        help="Path to setor CSV (default: assets/Renda Média (Setor Censitário).csv)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output GeoJSON path (default: public/data/ibge_municipios_2024_socio.geojson)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]

    default_zip = root / "assets" / "_ibge_municipios_2024" / IBGE_ZIP_NAME
    default_csv = root / "assets" / SETORES_CSV_NAME
    default_output = root / "public" / "data" / "ibge_municipios_2024_socio.geojson"

    ibge_zip = (args.ibge_zip or default_zip).resolve()
    setores_csv = (args.setores_csv or default_csv).resolve()
    output = (args.output or default_output).resolve()

    if not ibge_zip.exists():
        raise FileNotFoundError(
            f"Arquivo IBGE não encontrado: {ibge_zip}\n"
            "Baixe BR_Municipios_2024.zip para esse caminho antes de rodar o script."
        )
    if not setores_csv.exists():
        raise FileNotFoundError(f"CSV de setores não encontrado: {setores_csv}")

    extract_dir = ibge_zip.parent / "extract"
    extract_zip_if_needed(ibge_zip, extract_dir)
    shp_path = extract_dir / "BR_Municipios_2024.shp"
    if not shp_path.exists():
        raise FileNotFoundError(f"Shapefile não encontrado após extração: {shp_path}")

    print("Lendo agregados por município a partir do CSV de setores...")
    aggregates = load_setor_aggregates(setores_csv)
    print(f"Municípios agregados no CSV: {len(aggregates)}")

    print("Gerando GeoJSON municipal consolidado...")
    stats = build_layer(
        shp_path=shp_path,
        aggregates=aggregates,
        output_path=output,
        simplify_epsilon=args.simplify_epsilon,
        round_digits=args.round_digits,
    )

    print("Concluído.")
    print(f"Arquivo: {output}")
    print(f"Tamanho: {output.stat().st_size / (1024 * 1024):.2f} MB")
    for key, value in stats.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
