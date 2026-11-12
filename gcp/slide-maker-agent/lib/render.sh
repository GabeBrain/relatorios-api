#!/bin/sh
# pptx → pdf → png (INSTRUCOES §6.1). Uso: lib/render.sh saida/deck.pptx trabalho/thumbs [--dpi 60]
# A implementação está em render.py (LibreOffice + pypdfium2), testada também fora do contêiner.
set -eu
exec python3 "$(dirname "$0")/render.py" "$@"
