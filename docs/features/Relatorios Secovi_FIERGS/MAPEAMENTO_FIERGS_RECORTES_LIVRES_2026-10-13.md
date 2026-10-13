# FIERGS — mapeamento de recortes livres — 13/10/2026

## Estado e alcance

Gabriel comunicou aceite final da Juliana para o material atual. A ampliação para cidade isolada/conjunto é uma entrega nova. Esta análise é estática, sem API, testes de geração, alteração de runtime ou publicação. Baseline local `74cc572`; fetch confirmou zero commits atrás e três à frente de origin/main, todos de Corretor (`f5eff70`, `bb3326d`, `74cc572`). Não incluir esses commits em uma publicação sem tratar sua autorização/integração.

## 1. Seleção e motor

- `pages/PanoramaSecoviFiergsPage.tsx:55–78`: escolher FIERGS impõe RS e as dez cidades; UF e multisseletor ficam desabilitados. O próprio nome da opção e a ajuda confundem entidade com preset. Separar modelo FIERGS e recorte, mantendo ação explícita para restaurar o preset homologado.
- `presets.ts`: lista oficial de Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão. Preservar como atalho; não como restrição universal.
- `types.ts`: `PanoramaScope` já aceita uma ou N cidades; uma UF por relatório. Não existe identidade separada do preset no contrato atual. Detecção regional deve comparar conjunto completo normalizado + UF, nunca apenas quantidade dez, entidade ou presença de uma cidade.
- `api.ts:350–381`: coleta por cidade e consolida o recorte recebido; retry/cobertura já genéricos. Reutilizar o catálogo de municípios monitorados/autorizados da API. Não prometer qualquer cidade sem cobertura. Multiplas UFs no mesmo relatório exigiriam mudança de contrato, fora da expansão simples.
- `report/model.ts:488`: comparativo municipal só é habilitado com duas ou mais cidades. `domain/reconciliation.ts`, métrica crítica `sales.vertical.city`, usa esse comparativo e recebe null para uma cidade. Bloqueio concreto a tratar: reconciliar a cidade única diretamente na origem municipal, mantendo a ausência do comparativo visual.
- Guardas horizontais esperam subtotal VGV e somas disponíveis. Quando nenhum horizontal é elegível, subtotal não existe e soma vazia pode ser null. Revisar estados sem segmento, sem lançamentos na janela e sem valores observados: zero comprovado é diferente de fonte faltante. A coleta obrigatória também trata payload vazio como falha; confirmar respostas legítimas vazias antes de ampliar permissividade.
- Política de produtos continua própria do FIERGS: casas em condomínio e loteamentos abertos/fechados; chácaras excluídas. Não copiar política Secovi ao liberar seleção.
- `reference/fiergs-reviewed-horizontal-products.ts`: contingência nominal de sete empreendimentos auditados, chave UF/cidade/ID. Não cobre automaticamente produtos sem rótulo em outras cidades; rejeições precisam permanecer auditáveis, sem inferir produto pelo nome.

## 2. Inventário editorial: IDs oficiais, não posição final no PDF

A posição exportada varia com omissões. Exemplo: o quadro VGV foi página 55, mas é slide oficial 61. Usar os IDs estáveis do manifesto nas condições.

- **1, 3, 4 e 72–75, estáticos:** imagens institucionais Brain (capa, grupo, 23 anos e encerramentos). Podem permanecer nos recortes livres porque não representam a seleção municipal. Conferir textos incorporados às imagens na validação visual; não substituir todo o conjunto institucional por causa do mapa regional.
- **2, capa do estudo:** `FiergsStudyCover` imprime RM PORTO ALEGRE. Preservar no conjunto oficial exato; fora dele, usar cidade/UF ou título de conjunto com lista completa em página de escopo. Não basta mudar o nome do arquivo.
- **5, sobre o estudo:** `Corporate` fixa 10 municípios, exclusão de Porto Alegre e quatro produtos horizontais. Tornar quantidade/território dinâmicos; corrigir descrição para os três produtos elegíveis, sem contar chácaras excluídas. Quantidade de segmentos deve respeitar dados ou distinguir segmentos previstos de observados.
- **6, sumário:** estrutura já deriva do manifesto; atualizar títulos territoriais e numeração depois das omissões.
- **7, mapa/capa territorial:** `FiergsTerritorialCover` usa imagem `region-map.png`, título RM Porto Alegre e frase de dez municípios. Exclusivo do conjunto oficial exato. Para cidade única/outro conjunto, substituir por página de escopo com nomes e UF, ou mapa real do recorte; nunca reutilizar imagem regional estática. Ausência de coordenadas não deve impedir identificar as cidades selecionadas.
- **8, 23, 34, 38, 42, 48, 53, 62 e 70:** aberturas com fundo neutro e títulos por seção, reutilizáveis; remover aberturas órfãs se uma seção inteira não tiver conteúdo aplicável.
- **9, 11, 12, 14, 20, 22 e 24, 26, 32, 33, 35, 39:** famílias `FiergsQuarterlySlide` e `FiergsMarketQuarterlySlide` fixam RM de Porto Alegre no nome da série/legenda. Substituir por rótulo territorial efetivo em recortes livres, inclusive tooltip e exportação.
- **19 e 31:** análises por bairro/cidade. Cidade única pode dispensar a comparação trivial de 100% municipal e preservar bairros; não eliminar zeros observados. Evitar cidade única derrubar a reconciliação financeira/numérica.
- **Demais páginas analíticas, inclusive 61 (VGV), 63–66 (horizontal):** números derivados do cubo, sem necessidade de nova fórmula por cidade; revisar dados esparsos, ausência de produtos/tipologias e omissões informadas. Preservar oferta lançada na janela, estoque no fechamento e médias ponderadas aprovadas.
- **67–69:** mapas analíticos usam coordenadas dos projetos e escopo real. Reutilizar, verificando enquadramento de uma cidade, pontos coincidentes, conjunto extenso e cobertura parcial de coordenadas. São diferentes da imagem estática do slide 7.
- **71, equipe:** conferir autoria e contatos fixos antes de reaproveitar para outra praça; não inferir novos consultores pela cidade.
- `FiergsCityScope` e ramo FIERGS de `V2CityCover`: também contêm menções regionais. Mesmo quando não usados no fluxo principal atual, revisar para não reintroduzir o texto em caminho alternativo.
- `report/fiergs-manifest.ts`: títulos fixos de RM/4T25 nos metadados do manifesto precisam acompanhar o território/período. A denominação do manifesto de referência pode permanecer histórica; títulos expostos ao usuário não.
- `lib/pdf-print-interceptor.ts`: ponte antiga substitui páginas por número absoluto com imagens Secovi; busca em src não encontrou importador ativo. Não a ativar na expansão; confirmar PDF/PPT continuam usando o manifesto atual.

## 3. Metodologia, arquivos e identidade

- `ReportReferencePanels.tsx`: texto FIERGS diz que Porto Alegre nunca integra o recorte. Passar escopo real; essa exclusão pertence ao preset, não ao modelo. Escolher Porto Alegre sozinho deve ser permitido se autorizado/monitorado.
- `types.ts:scopeFileSlug`: qualquer FIERGS vira `fiergs-rs`, mesmo fora do preset. Preservar nome aprovado para preset exato; incluir cidade/conjunto e UF nos demais. Nomes determinísticos e distintos evitam confundir estudos do mesmo período.
- `lib/export-metadata.ts`: título considera somente entidade/período, embora assunto contenha cidades; alinhar título ao território para PDF e PPT.
- `lib/fiergs-audit.ts`: nome CSV contém apenas entidade/período. Acrescentar recorte nos livres para pareamento inequívoco PDF/CSV. Registrar preset/modo e cidades reais também na proveniência quando introduzidos.
- Fora do RS, manter a regra analítica como “modelo FIERGS”, sem apresentar a cidade como RS ou como estudo metropolitano homologado. Recomendação: primeira liberação de cidades monitoradas no RS; se escopo nacional for desejado, liberar UF com identidade territorial correta. A escolha de abrangência precisa ficar explícita na implementação.

## 4. Critérios para implementar e publicar

1. Identidade de escopo centralizada: modelo, UF, cidades, preset exato e rótulos. Preservar o conjunto homologado independentemente da ordem das cidades.
2. Seleção livre + atalho do preset; estado de geração invalidado ao trocar escopo; validação das cidades autorizadas.
3. Guardas para uma cidade, ausência real de segmento e cobertura incompleta; sem converter indisponibilidade em zero.
4. Capas, legendas, metodologia, sumário, PDF/PPT e CSV derivados da mesma identidade; revisão das imagens estáticas.
5. Ensaios: dez cidades oficiais, uma delas isolada, conjunto parcial, conjunto diferente com dez cidades, Porto Alegre, cidade sem horizontal/sem lançamentos e falha de uma cidade. Outra UF somente se entrar no escopo autorizado.
6. Conferir dados/avisos e ausência de RM/10 municípios/mapa regional fora do preset. Preservar regressão 2T2026 e 4T2025 do preset; executar ensaios reais conforme autorização do usuário.
7. Publicar com histórico Git revisado, validar no site cidade única e conjunto e só então comunicar nova capacidade à Juliana. O aceite anterior já está encerrado e não depende desta expansão.

Conclusão: não basta habilitar o multisseletor. O motor é reaproveitável; os pontos críticos são a guarda municipal para uma cidade, os universos vazios e a identidade editorial regional.
