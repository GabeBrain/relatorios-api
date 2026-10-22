# Fontes, cronologia e decisões

## 19/10/2026 — Reunião das10h

Fonte bruta preservada na raizSE: `.local-inputs/reunioes/2026-10-19_10h/transcricao.txt`. Síntese estratégica: `_Planejamento/2026-10-19_a_2026-10-23_PROPOSTA.md`. Os nomes FinOps/jow brain na transcrição automática foram interpretados pelo contexto como Finotti/Geobrain; confirmar nomes técnicos de campos na origem.

Trecho principal, linhas27–65: ampliar cidades estimadas com precisão, exercício fora do Geobrain na Rebrain enquanto Nicolas está fora, depois integração nativa. Exportar base e retornar no mesmo formato. Edgar conduz com apoio de Gabriel. Material esperado19–20/10, exercício até23/10 condicionado a isso; objetivo operacional novembro, expansão dezembro. Alternar períodos com coleta real para evitar viés acumulado. Dúvidas sobre `estimation` e campo transcrito `IVV BET`: Edgar descreve pergunta, Diego intermedeia com Evandro/Belogic. A reunião não confirmou os tipos ou a semântica desses campos.

## Card Monday consultado em21/10

[Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074), ID13096757074, board18398428946. Leitura apenas; este pacote não altera nome,status,prazo,responsável ou comentários. A leitura atual dos comentários não é comprovação de status atualizado do card.

### Registro Edgar —21/09/2026,14h52 São Paulo

Comentário5565425384. Regras anotadas de reunião anterior:

- Vendas e estoque com base no IVV dos últimos3meses do empreendimento.
- Não alterar passado; estimar futuro.
- Após período estimado, próximo período deve ser coletado; usar campo `estimation` do período.
- Preços corrigidos pelo INCC.
- Validação mensal: Belo Horizonte/Fortaleza, metade dos empreendimentos. Trimestral: Blumenau/Guarulhos.
- Ligar para estoques entre0e5 e acima30. Para demais, alternar metade coletada/metade estimada por período. **Unidade/faixa e tratamento exato das bordas precisam confirmação.**
- Comparar estimativa com dois períodos anteriores.
- Ao chegar nova tabela real, diferença ajustada em vendas ou distratos, segundo o comentário. Procedimento/autoridade exatos ainda pendentes.

Estas são regras históricas; precisam ser conciliadas com a metodologia Finotti de21/10. Não usar o texto como especificação integral aprovada do novo motor.

### Anexos Edgar —06/10/2026,17h07 São Paulo

Comentário5610817039:

- `Cálculo IVV Produção.xlsx`, asset3298910827,16.467bytes.
- `Cálculo IVV homologação.xlsx`, asset3298910845,193.020bytes.

**Planilhas não baixadas nem abertas nesta preparação.** Recuperar no card se Edgar indicar que representam o contrato atual; não presumir equivalência com a curva nova. Metadados registram fonte, não homologação do conteúdo.

## 19–20/10/2026 — Esclarecimento encaminhado por Gabriel em22/10

Fonte: transcrição de mensagens de Edgar (19/10,15h59) e Diego (20/10,09h34) fornecida por Gabriel nesta conversa. Diego identificou sua mensagem como resposta de Evandro; não foi consultado o registro original no Geobrain. A pergunta de Edgar usou `bases.estimation` e `bases.ivv_batch_id`; a resposta transcrita alterna `base`/`bases`.

- `bases.estimation` é a **única flag** indicada para identificar que os valores de um empreendimento foram estimados **naquela base/período**.
- `bases.ivv_batch_id` rastreia as bases alteradas em uma atualização de valores por IVV em lote. Não é a flag de estimativa.
- A resposta não define como a API de histórico materializa bases/competências, nem o contrato de exportação e retorno. Na sondagem de22/10, `estimation` apareceu no objeto de empreendimento, sem flag em cada linha mensal. Não inferir que o valor atual descreve todos os meses do histórico.

Gabriel decidiu usar uma exportação real do Geobrain como amostra do **formato** e reconciliá-la com as séries amplas da API. Até essa amostra chegar, a implementação planejada da página usa leitura por API e exportação de resultados de revisão, sem importação/upload nem arquivo de retorno operacional.

**Resultado da amostra recebida:** [auditoria da Análise Temporal](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md). O arquivo demonstra o formato do relatório agregado, não o esquema das bases individuais nem do retorno. O manual do Geobrain no repo Linkages esclarece a finalidade da tela e aponta exportação detalhada do Mapa como próxima fonte candidata. A página API segue independente desse arquivo.

## 21/10/2026,12h18 — Email Finotti

Fonte: captura fornecida por Gabriel. Assunto “Re: Dados Curva de Vendas”; remetente Lucas Finoti. Corpo:

> Bom dia, pessoal!
>
> Rodei os testes com loteamentos abertos e fechados.
>
> Da mesma forma que os produtos verticais, a equação da curva de vendas faz estimativas melhores que a média trimestral ou12meses.
>
> Segue o ppt com o resumo dos testes.
>
> Vou subir os arquivos MD no drive para iniciarmos os testes na base.
>
> Abraço,

Destinatários/assinaturas/contatos pessoais omitidos da documentação técnica. PPTX fornecido originalmente em Downloads, preservado na pasta local de insumos deste repo. Ver manifesto de integridade. Consulta ao Drive conectado não localizou os MD relevantes; não comprova ausência global. No momento desta preparação não há base recebida e testada para a nova curva.

## 21/10/2026 — Direção de Gabriel nesta conversa

Gabriel pediu pasta dedicada no repo Rebrain com documentação e manifesto detalhado, para desenvolvimento em conversa separada. A conversa de origem continua para estratégia/agenda. Pacote preparado, sem implementação de motor ou UI e sem nova publicação. Recomendação: manter cálculo independente da interface, piloto de arquivos e validação retrospectiva antes do retorno operacional Geobrain.

## Integridade e portabilidade

PPTX:`Equacao_vendas_horizontais_Brain  -  Reparado.pptx`, SHA256:`70fd2c238abf36ecbf54d5101951b8a7f266f551b6f6e31030b3f419fdd5a923`,576.215bytes,10slides. Local:`.local-inputs/estimativas-vendas/2026-10-21/` na raiz do repo, ignorado. Texto por slide e dados dos gráficos nativos estão no derivado versionável desta pasta; imagens e aparência podem exigir o PPTX local. A extração não faz reconhecimento de texto em imagens nem valida a matemática. Original de Downloads e pacote inicial da raizSE preservados.
