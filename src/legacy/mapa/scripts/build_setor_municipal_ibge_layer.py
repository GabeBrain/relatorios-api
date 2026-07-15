#!/usr/bin/env python3
"""
Legacy entrypoint kept for compatibility.

This project now uses POF Curitiba as the setor base for the frontend.
Use this script as an alias to:
`scripts/build_setor_pof_curitiba_layer.py`
"""

from build_setor_pof_curitiba_layer import main


if __name__ == "__main__":
    print(
        "[INFO] build_setor_municipal_ibge_layer.py agora delega para "
        "build_setor_pof_curitiba_layer.py (base setorial POF Curitiba)."
    )
    main()
