# Materiais disponíveis e fila

Fonte: [Modelos reBrain — Entidades/Institucionais](https://drive.google.com/drive/folders/139aKOxC4clvhHe0uXsRJ8lhdIK5cdaYA). Inventário em 14/10: 80 arquivos diretos, 76 PPTX/3 XLSX/1 DOCX. Nove PPTX diretos lidos pelo conector em texto, não revisão visual completa; catálogo em [fontes/modelos.json](fontes/modelos.json). Não contar blocos de texto como páginas nem garantir números embutidos em imagens a partir desse texto.

Os três XLSX listados são Curitiba, Ademi GO e CBIC, não planilhas granulares dos quatro modelos abaixo. A planilha priorizada `Panoramas Entidades e Institucionais.xlsx` é anexo do card parent (asset 3208961418); ainda não analisada. Exemplo de API interna anexo: `sample_interna.json` (3261775306), contrato atual deve ser confrontado com o código, não assumido por um exemplo antigo.

## SP — primeiro piloto recomendado, não imposição de ordem sem alinhamento

[Subitem institucional mensal/trimestral](https://brain381753.monday.com/boards/18398638577/pulses/13149411648). Três referências diretas: institucional maio mensal, junho/2T26, layout Secovi preenchido com Baixada Santista 2T26. Fontes complementares listadas: Interior SP 1T26 (42 cidades/intenções de compra), MCMV SP e Luxo SP 1T26. Interior/segmentos são outros produtos, não requisitos automáticos do piloto capital.

Maior acervo dos quatro; motor de gráficos/estoque/preços/mapas já próximo. Mesmo assim SP institucional **não é sinônimo de Secovi multicidades**. Janela mensal, médias sem MCMV, comparativos de 12 meses, destaques narrativos e valores corrigidos pelo INCC exigem contrato. Nunca usar trimestre inteiro para preencher maio. Definir um caso de teste da capital com fonte mensal comprovada; se não houver, entregar lacuna e não chamar aproximação de relatório mensal.

## Fortaleza — melhor método explícito

[Subitem SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420). Junho/2T26 e julho/26. Municípios listados: Fortaleza, Aquiraz, Caucaia, Eusébio, Maracanaú, separando capital/RM. Material define início das vendas para lançamento, diferença das tabelas mensais para estoque/vendas/distratos e preço de tabela por unidade. Inclui casas/sobrados, loteamentos, comercial e agrupamentos por bairro/padrão.

Investigar exclusões explícitas do preço RM, teto MCMV atualizado por data e universo de cada bloco. Não importar exceções/números da versão julho como constantes. Existe material para começar sem novo PPT; a fidelidade depende de fonte mensal/por unidade, não apenas de totais trimestrais.

## Recife — núcleo reutilizável, regras locais

[Subitem ADEMI](https://brain381753.monday.com/boards/18398638577/pulses/13149406845). Maio mensal e 2T26. No mensal, recorte Recife, Jaboatão dos Guararapes, Olinda e Paulista. Confirmar o conjunto da versão escolhida antes de assumir igualdade entre períodos. Vertical/capital/RM, preços, maturidade, disponibilidade, mapas, VGV/IVV; versão trimestral também traz comparações entre capitais e apêndices.

Morar Bem desdobra padrão Econômico; INCC aparece nos valores. Não colapsar categorias locais para forçar igualdade com FIERGS. Comparação regional/socioeconômica depende de fontes externas ao cubo local; delimitar núcleo e apêndices. Há modelos suficientes, não fórmula de ponderação/índice integralmente comprovada.

## Maceió — mais dependências externas

[Subitem SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169). Maio e junho/26. Junho lista Maceió, Pilar, Marechal Deodoro, Paripueira, Rio Largo, Barra de São Miguel; maio também lista Coqueiro Seco. Essa diferença é um fato documental, causa ainda desconhecida. Não apagar cidade nem adicioná-la por inferência.

Vertical, horizontal e comercial, capital/RM, emprego CAGED, apêndices e INCC em partes do histórico. Mapear fontes de emprego/índice e cobertura comercial antes de prometer equivalência integral. O cubo atual não autoriza chamar comercial de residencial para reaproveitar gráfico. Dois decks bastam como referência de implementação; podem não bastar como banco de dados de cálculo.

## Como recuperar os arquivos

Abrir links do JSON com conta própria; em conector Drive, buscar metadados e usar fetch legível para descoberta, raw download para PPTX, sem converter/mutar o original. Conferir nome/ID/parent. Arquivo bruto em `.local-inputs/relatorios-lucas/<modelo>/`, hash/data num manifesto derivado pequeno. Sem conector, baixar manualmente. Não inserir os binários na pasta versionada deste handoff.

Se houver gráfico/tabela como imagem, inspecionar a página real e extrair evidência com localização; cache de gráfico/planilha embutida pode ser usado como gabarito daquela versão, não como fonte oficial contínua. Procurar dados no motor/API e material já disponível antes de pedir à analista. Perguntas humanas só para definição que os dados/documentos não resolvam, com alternativa e impacto objetivos.

**Conclusão:** quatro famílias viáveis para iniciar, não quatro relatórios completos homologados. Ranking proposto pelo menor atrito: SP→Fortaleza→Recife→Maceió; sequência histórica do Monday SP→Fortaleza→Maceió→Recife preservada. A diferença na ordem dos últimos dois é sugestão técnica, não mudança de prioridade/status no Monday.
