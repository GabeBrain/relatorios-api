# CTA — Nova sessão de desenvolvimento

Abra a conversa no repositório `C:\Users\GaloD\Desktop\SE\Relatorios API\relatorios-api` e cole:

---

Vamos iniciar a ferramenta de **Estimativas de vendas por empreendimento — Finotti**, na Rebrain. A conversa de origem fica para estratégia semanal; esta sessão será técnica.

Leia integralmente os AGENTS aplicáveis, começando pela raizSE e pelo repo. Depois leia `docs/features/estimativas-vendas/README.md`, `MANIFESTO.md`, `FONTES_E_DECISOES.md`, `CONTRATO_E_VALIDACAO.md` e o derivado dos slides em `fontes/`. O PPTX recebido e o manifesto de integridade estão em `.local-inputs/estimativas-vendas/2026-10-21/`, ignorados pelo Git. Se estiver em outro clone, os documentos estão versionáveis, mas o binário precisa ser disponibilizado localmente.

Primeiro identifique todos os remotos, execute fetch e compare a main com cada um, seguindo AGENTS. Preserve alterações/commits de outras frentes; não use reset/rebase nem abra branch. Não faça push ou deploy sem autorização. Consulte plano e diário da semana na raizSE para atualizar o avanço desta sessão.

Contexto: Diego pediu exercício externo na Rebrain para estimar vendas/estoque de empreendimentos, exportando dados Geobrain e devolvendo no mesmo contrato. Edgar conduz; Gabriel apoia. Depois a regra será levada ao Geobrain com Nicolas. Finotti fornece a metodologia e não é Lucas Gonçalves. Material chegou21/10; o alvo23/10 precisa ser redimensionado pelos insumos.

O PPT traz curva horizontal para loteamentos abertos/fechados, parâmetros distintos e cauda após95% vendido. Ainda faltam confirmar MD/código original, faixas de incerteza, modelo vertical e contrato real dos arquivos. Há regras antigas de coleta/alternância/INCC no Monday, que precisam ser reconciliadas com Edgar. O erro9,1pp relatado refere-se ao acumulado24meses, não ao erro do próximo mês. Não invente bandas, coeficientes, dados ou significado de campos.

Comece inventariando o que está disponível e o que falta. Reproduza o caso fechado300unidades/150vendidas/6meses com a fórmula documentada e tolerância de arredondamento. Separe motor determinístico, parâmetros, adaptação de arquivos e futura UI. Se os insumos permitirem, implemente a primeira fatia do motor horizontal e os testes matemáticos relevantes; registre dúvidas de domínio/cauda sem escolhas ocultas. Não deixe a reprodução independente parada por falta de acesso ao Drive; descreva os limites do que foi possível validar.

Em seguida, prepare o teste retrospectivo com um recorte real e a comparação com o método atual, sem usar futuro nas entradas. Não processe base inexistente, não trate estimativa como coleta e não escreva automaticamente no Geobrain. Perguntas que dependam da regra de negócio ficam explícitas para Edgar/Gabriel.

O destino proposto do código é `src/features/estimativas-vendas/` e da rota `/rebrain/estimativas-vendas`, ainda não existentes. Não é necessário criar outra aplicação, banco ou migração de hospedagem para iniciar. Antes de UI, siga System Design Geobrain, diretrizes frontend e GeoApiScopeEngine quando houver API/escopo geográfico. Sociodemografia não é dependência demonstrada deste modelo.

Ao terminar, atualize este pacote, `docs/projetos/LIVE_rebrain.md`, plano e acompanhamento pessoal de Gabriel. Informe o que foi apenas preparado, testado localmente, commitado, publicado e homologado. Faça commit isolado conforme AGENTS e deixe push/deploy para autorização explícita. Traga estado atual, evidências, impedimentos e próximo incremento de maior valor.

---
