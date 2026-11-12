#!/usr/bin/env python
"""Build the 4T2025 FIERGS validation workbook from extracted PPTX evidence.

Usage:
    python scripts/build-fiergs-validation-matrix.py REFERENCE.json OUTPUT.xlsx
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


GREEN = "D9EAD3"
RED = "F4CCCC"
YELLOW = "FFF2CC"
DARK = "274E13"
LIGHT = "EAF2E3"


def style_header(sheet: Any, row: int = 1) -> None:
    for cell in sheet[row]:
        cell.fill = PatternFill("solid", fgColor=DARK)
        cell.font = Font(color="FFFFFF", bold=True)
        cell.alignment = Alignment(vertical="center", wrap_text=True)


def autosize(sheet: Any, limits: dict[int, int] | None = None) -> None:
    limits = limits or {}
    for column in range(1, sheet.max_column + 1):
        width = max((len(str(sheet.cell(row, column).value or "")) for row in range(1, sheet.max_row + 1)), default=8) + 2
        sheet.column_dimensions[get_column_letter(column)].width = min(width, limits.get(column, 45))


def add_status_rules(sheet: Any, column: str, first_row: int, last_row: int) -> None:
    target = f"{column}{first_row}:{column}{last_row}"
    sheet.conditional_formatting.add(target, FormulaRule(formula=[f'{column}{first_row}="IGUAL"'], fill=PatternFill("solid", fgColor=GREEN)))
    sheet.conditional_formatting.add(target, FormulaRule(formula=[f'{column}{first_row}="DIVERGENTE"'], fill=PatternFill("solid", fgColor=RED)))
    sheet.conditional_formatting.add(target, FormulaRule(formula=[f'{column}{first_row}="PENDENTE"'], fill=PatternFill("solid", fgColor=YELLOW)))


def slide_title(slide: dict[str, Any]) -> str:
    return next((text for text in slide["texts"] if text and "FONTE:" not in text.upper()), f"Slide {slide['slide']}")


def build(reference: dict[str, Any], output: Path) -> None:
    workbook = Workbook()
    instructions = workbook.active
    instructions.title = "LEIA-ME"
    instructions.append(["Matriz de paridade — FIERGS RM Porto Alegre 4T2025"])
    instructions.append(["Fonte oficial", reference["source"]])
    instructions.append(["Slides na fonte", reference["slideCount"]])
    instructions.append(["Como usar", "Cole/transcreva o valor do PDF novo em 'Obtido'. O status é calculado automaticamente."])
    instructions.append(["Status", "IGUAL, DIVERGENTE, PENDENTE ou NÃO COMPARÁVEL."])
    instructions.append(["Regra numérica", "Diferença absoluta dentro da tolerância. Contagens usam 0; decimais usam 0,005."])
    instructions.append(["Limite", "Slides horizontais 63–66 são raster no deck oficial e exigem conferência visual/manual."])
    instructions.append(["Limite", "Mapas validam legenda e aparência; posição geográfica requer inspeção visual."])
    instructions["A1"].font = Font(bold=True, size=16, color=DARK)
    instructions.column_dimensions["A"].width = 24
    instructions.column_dimensions["B"].width = 100
    instructions.freeze_panes = "A2"

    numeric = workbook.create_sheet("PARIDADE NUMÉRICA")
    numeric.append(["Slide", "Título", "Origem", "Série / linha", "Categoria / coluna", "Esperado", "Obtido", "Tolerância", "Status", "Observação"])
    style_header(numeric)
    for slide in reference["slides"]:
        title = slide_title(slide)
        for chart_index, chart in enumerate(slide["charts"], start=1):
            for plot in chart["plots"]:
                categories = plot["categories"]
                for series in plot["series"]:
                    for index, expected in enumerate(series["values"]):
                        category = categories[index] if index < len(categories) else str(index + 1)
                        tolerance = 0 if isinstance(expected, (int, float)) and float(expected).is_integer() else 0.005
                        numeric.append([slide["slide"], title, f"Gráfico {chart_index} / plot {plot['index']}", series["name"], category, expected, None, tolerance, None, None])
        for table_index, table in enumerate(slide["tables"], start=1):
            if not table:
                continue
            headers = table[0]
            for row_index, row in enumerate(table[1:], start=2):
                row_label = row[0] if row else f"Linha {row_index}"
                for column_index, expected in enumerate(row[1:], start=2):
                    if expected in (None, ""):
                        continue
                    header = headers[column_index - 1] if column_index <= len(headers) else f"Coluna {column_index}"
                    numeric.append([slide["slide"], title, f"Tabela {table_index}", row_label, header or f"Coluna {column_index}", expected, None, None, None, None])

    for row in range(2, numeric.max_row + 1):
        numeric.cell(row, 9).value = f'=IF(G{row}="","PENDENTE",IF(AND(ISNUMBER(F{row}),ISNUMBER(G{row})),IF(ABS(G{row}-F{row})<=H{row},"IGUAL","DIVERGENTE"),IF(TRIM(G{row}&"")=TRIM(F{row}&""),"IGUAL","DIVERGENTE")))'
    numeric.freeze_panes = "A2"
    numeric.auto_filter.ref = numeric.dimensions
    add_status_rules(numeric, "I", 2, numeric.max_row)
    autosize(numeric, {2: 55, 4: 32, 5: 28, 10: 45})

    visual = workbook.create_sheet("CHECKLIST VISUAL")
    visual.append(["Slide", "Título", "Tem números nativos?", "Conteúdo", "Layout", "Gráfico / tabela", "Texto", "Mapa", "Status geral", "Observação"])
    style_header(visual)
    for slide in reference["slides"]:
        content = "NUMÉRICO + VISUAL" if slide["validationMode"] == "numeric" else "VISUAL / RASTER"
        visual.append([slide["slide"], slide_title(slide), "SIM" if slide["validationMode"] == "numeric" else "NÃO", content, None, None, None, None, "PENDENTE", None])
    visual.freeze_panes = "A2"
    visual.auto_filter.ref = visual.dimensions
    add_status_rules(visual, "I", 2, visual.max_row)
    autosize(visual, {2: 62, 10: 55})

    coverage = workbook.create_sheet("COBERTURA")
    coverage.append(["Slide", "Título", "Tabelas", "Gráficos", "Imagens", "Modo primário", "Limite / ação"])
    style_header(coverage)
    for slide in reference["slides"]:
        action = "Comparar valores + visual" if slide["validationMode"] == "numeric" else "Comparar visualmente"
        if 63 <= slide["slide"] <= 66:
            action = "Horizontal raster: transcrever e comparar manualmente"
        elif 67 <= slide["slide"] <= 69:
            action = "Mapa: conferir legenda, pontos, enquadramento e escala"
        coverage.append([slide["slide"], slide_title(slide), len(slide["tables"]), len(slide["charts"]), slide["pictures"], slide["validationMode"].upper(), action])
    coverage.freeze_panes = "A2"
    coverage.auto_filter.ref = coverage.dimensions
    autosize(coverage, {2: 62, 7: 62})

    for sheet in workbook.worksheets[1:]:
        for row in sheet.iter_rows(min_row=2):
            if row[0].row % 2 == 0:
                for cell in row:
                    if cell.fill.fill_type is None:
                        cell.fill = PatternFill("solid", fgColor=LIGHT)
            for cell in row:
                cell.alignment = Alignment(vertical="top", wrap_text=True)

    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)
    print(f"Matrix written: {output} ({numeric.max_row - 1} numeric checks; {visual.max_row - 1} visual checks)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    reference = json.loads(args.reference.read_text(encoding="utf-8"))
    build(reference, args.output)


if __name__ == "__main__":
    main()
