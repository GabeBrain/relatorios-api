#!/usr/bin/env python3
"""
Build the sector layer for Curitiba from POF GeoJSON input.

Default input:
- assets/POF_Curitiba_Goiania_Maceio_Domicilios2022.geojson

Default output:
- public/data/pof_setores_2026/4106902.geojson
"""

from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

TARGET_CD_MUN = "4106902"
TARGET_CITY_CANON = "CURITIBA"
TARGET_CITY_LABEL = "Curitiba"
TARGET_UF = "PR"

NUMERIC_FIELDS = [
    "domicilios_26",
    "Domicilios_22",
    "nr_pessoas_v0001",
    "taxa_domicilios_22",
    "rend_mensal_por_domicilio2026",
    "rend_mensal_por_pessoa2026",
    "nr_salario_minimo_mensal_por_domicilio",
    "nr_salario_minimo_mensal_por_pessoa",
    "total_despesas_consumo",
    "total_alimentacao_fora",
    "total_alimentacao_dentro",
    "total_habitacao",
    "total_gastos_medicamentos",
    "total_recreacao_e_cultura",
    "total_investimento_em_imovel",
    "tx_despesas_consumo",
    "tx_alimentacao_fora",
    "tx_alimentacao_dentro",
    "tx_habitacao",
]


def normalize_text(value: Any) -> str:
    text = str(value or "").strip().upper()
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))


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


def is_curitiba_feature(props: Dict[str, Any]) -> bool:
    city = normalize_text(
        props.get("nm_municipio")
        or props.get("NM_MUN")
        or props.get("municipio")
    )
    uf = normalize_text(props.get("sigla_uf") or props.get("SIGLA_UF") or "")
    return city == TARGET_CITY_CANON and (not uf or uf == TARGET_UF)


def enrich_properties(props: Dict[str, Any], cd_setor: str) -> Dict[str, Any]:
    out = dict(props)
    out["CD_SETOR"] = cd_setor
    out["CD_MUN"] = TARGET_CD_MUN
    out["NM_MUN"] = TARGET_CITY_LABEL
    out["SIGLA_UF"] = TARGET_UF

    # Requested proxy name. Source does not have exact "domicilios_26".
    out["domicilios_26"] = out.get("domicilios_26", out.get("Domicilios_22"))

    for field in NUMERIC_FIELDS:
        if field not in out:
            continue
        out[field] = parse_number(out.get(field))

    return out


def transform_features(features: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    transformed: List[Dict[str, Any]] = []
    for feature in features:
        props = feature.get("properties") or {}
        if not isinstance(props, dict):
            continue
        if not is_curitiba_feature(props):
            continue

        cd_setor = str(props.get("cd_setor") or props.get("CD_SETOR") or "").strip()
        if not cd_setor:
            continue

        geometry = feature.get("geometry")
        if not geometry:
            continue

        transformed.append(
            {
                "type": "Feature",
                "id": cd_setor,
                "properties": enrich_properties(props, cd_setor),
                "geometry": geometry,
            }
        )

    transformed.sort(
        key=lambda item: str((item.get("properties") or {}).get("CD_SETOR", ""))
    )
    return transformed


def build_layer(source_path: Path, output_path: Path) -> None:
    source = json.loads(source_path.read_text(encoding="utf-8"))
    source_features = source.get("features")
    if not isinstance(source_features, list):
        raise RuntimeError("GeoJSON de entrada sem lista de features valida.")

    features = transform_features(source_features)
    if not features:
        raise RuntimeError("Nenhuma feature de Curitiba encontrada no GeoJSON de entrada.")

    output = {
        "type": "FeatureCollection",
        "name": "pof_setores_2026_4106902",
        "features": features,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"Input: {source_path}")
    print(f"Output: {output_path}")
    print(f"Features de Curitiba: {len(features)}")
    print(f"Tamanho: {output_path.stat().st_size / (1024 * 1024):.2f} MiB")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build setor layer from POF source (Curitiba only)."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help=(
            "Path do POF GeoJSON de origem "
            "(default: assets/POF_Curitiba_Goiania_Maceio_Domicilios2022.geojson)"
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Path de output (default: public/data/pof_setores_2026/4106902.geojson)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    input_path = (
        args.input
        if args.input
        else root / "assets" / "POF_Curitiba_Goiania_Maceio_Domicilios2022.geojson"
    )
    output_path = (
        args.output
        if args.output
        else root / "public" / "data" / "pof_setores_2026" / f"{TARGET_CD_MUN}.geojson"
    )

    input_path = input_path.resolve()
    output_path = output_path.resolve()

    if not input_path.exists():
        raise FileNotFoundError(f"Arquivo de entrada nao encontrado: {input_path}")

    build_layer(input_path, output_path)


if __name__ == "__main__":
    main()
