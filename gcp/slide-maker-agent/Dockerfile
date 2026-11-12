# Slide Maker — serviço do agente (INSTRUCOES_DESENVOLVIMENTO.md §10, §15.1).
#
# Build pela RAIZ do repositório (a imagem lê docs/ e gcp/slide-maker-agent/):
#   gcloud builds submit --config gcp/slide-maker-agent/cloudbuild.yaml ...   (ver README.md)
# O Cloud Build baixa os ativos de marca do bucket privado para gcp/slide-maker-agent/.marca/ antes
# deste Dockerfile; sem eles (ou sem as fontes), o build falha.

# ---------- 1. Compilação do serviço (TypeScript) ----------
FROM node:22-bookworm-slim AS compilacao
WORKDIR /build
COPY gcp/slide-maker-agent/package.json gcp/slide-maker-agent/package-lock.json ./
# Sem --omit=optional: o Agent SDK (Fase 4) entrega o binário do CLI como dependência opcional.
RUN npm ci
COPY gcp/slide-maker-agent/tsconfig.json gcp/slide-maker-agent/tsconfig.build.json ./
COPY gcp/slide-maker-agent/src ./src
RUN npx tsc -p tsconfig.build.json && npm prune --omit=dev

# ---------- 2. Imagem final ----------
FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/tmp \
    NODE_ENV=production \
    WORK_ROOT=/work

# LibreOffice (render), poppler (pdftoppm/pdffonts), fontconfig, corretor pt-BR, pandoc e o que o
# sandbox do Agent SDK usa no Linux (bubblewrap + socat). curl serve ao diagnóstico de isolamento.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-impress poppler-utils fontconfig hunspell-pt-br pandoc \
      bubblewrap socat curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Node 22 da etapa oficial (o Python 3.12 vem da imagem base).
COPY --from=compilacao /usr/local/bin/node /usr/local/bin/node

COPY gcp/slide-maker-agent/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Fontes: Neo Sans Pro (bucket privado; fonte comercial, fora do repositório público) e Montserrat
# (OFL, estáticas do repositório oficial, commit fixado). O build falha se alguma faltar.
COPY gcp/slide-maker-agent/.marca/fontes/ /usr/local/share/fonts/brain/neo-sans/
ARG MONTSERRAT_COMMIT=555facfb2a18c72c3c0380f0d9c0f060453a9058
RUN set -eu; d=/usr/local/share/fonts/brain/montserrat; mkdir -p "$d"; \
    for peso in Regular Italic Medium MediumItalic SemiBold SemiBoldItalic Bold BoldItalic ExtraBold Black Light; do \
      curl -fsSL -o "$d/Montserrat-$peso.ttf" "https://raw.githubusercontent.com/JulietaUla/Montserrat/$MONTSERRAT_COMMIT/fonts/ttf/Montserrat-$peso.ttf"; \
    done; \
    curl -fsSL -o "$d/OFL.txt" "https://raw.githubusercontent.com/JulietaUla/Montserrat/$MONTSERRAT_COMMIT/OFL.txt"; \
    fc-cache -f; \
    fc-list | grep -qi "neo sans" || { echo "FALHA: Neo Sans Pro não instalada"; exit 1; }; \
    fc-list | grep -qi "montserrat" || { echo "FALHA: Montserrat não instalada"; exit 1; }

WORKDIR /app
# Base de conhecimento (fonte única: docs/). 06 e comando-qualificar são desenho antigo e não entram (§6.1).
COPY docs/features/apresentacoes/base-conhecimento/ ./kb/
RUN rm -f kb/06-arquitetura-claude-code.md kb/comando-qualificar.md
# Ativos de marca, exceto as fontes, que já estão instaladas no sistema.
COPY gcp/slide-maker-agent/.marca/ ./marca/
RUN rm -rf marca/fontes \
 && test -f marca/slides-finais/fabio.png && test -f marca/slides-finais/guilherme.png && test -f marca/slides-finais/finoti.png \
 && test -f "marca/logos/Logo-Brain-Sem tagline.png" \
 || { echo "FALHA: ativos de marca incompletos (ver DEPLOY_GCP.md B1)"; exit 1; }

COPY --from=compilacao /build/node_modules ./node_modules
COPY --from=compilacao /build/dist ./dist
COPY --from=compilacao /build/package.json ./package.json

# Teste de fumaça (§10): LibreOffice renderiza um slide com as duas fontes, de fato embutidas no PDF.
COPY gcp/slide-maker-agent/fumaca/fumaca.py /tmp/fumaca.py
RUN python /tmp/fumaca.py && rm -rf /tmp/fumaca /tmp/fumaca.py /tmp/.config /tmp/.cache

# Usuário sem privilégio; /work é o único diretório gravável do serviço além de /tmp.
RUN useradd --uid 10001 --home-dir /tmp --no-create-home --shell /usr/sbin/nologin agente \
 && mkdir -p /work && chown agente:agente /work
USER agente

EXPOSE 8080
CMD ["node", "dist/server.js"]
