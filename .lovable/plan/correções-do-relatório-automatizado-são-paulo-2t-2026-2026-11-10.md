# Correções do relatório automatizado — São Paulo, 2T 2026

## Escopo

Aplicar a especificação enviada ao relatório institucional de São Paulo, na prévia e no PowerPoint exportado. Não alterar Banco Quanti, Corretor, Empresas, Secovi ou FIERGS.

## 1. Apresentação e textos

- Uniformizar os textos editáveis e gráficos em Tahoma, incluindo sumário, páginas institucionais e equipe, sem trocar as fontes da plataforma.
- Remover a casinha das divisórias, inclusive quando incorporada à imagem de fundo; remover apenas o botão invisível não resolve a imagem.
- Remover “Trimestre completo até…” das capas, sumário e destaques. Preservar a indicação de parcial nas ferramentas de conferência quando o período realmente estiver incompleto.
- Usar “SUMÁRIO”, título de 28–30 pt e itens com primeira letra maiúscula.
- Retirar a observação demográfica indicada e notas de trimestre parcial das edições consolidadas.
- Gerar manchetes comerciais a partir dos números confirmados. Só afirmar “recorde” quando a cobertura histórica comprovar a comparação; não fixar os números do exemplo.

## 2. Gráficos

- Suavizar todas as linhas, mantendo os pontos observados, e retirar retângulos escuros sobre seus rótulos.
- Colocar o trimestre no subtítulo; apresentar rótulos de VGL/VGV em milhões sem casas decimais e citar apenas FGV como fonte do INCC-DI em São Paulo.
- Mostrar vendas do Top 10 bairros em percentual sobre as vendas líquidas municipais e preencher sua participação acumulada. Manter indisponibilidade explícita quando uma participação não for matematicamente válida.
- Adicionar rótulos de oferta final e alinhar os quadros MCMV/MAP às respectivas tipologias.

## 3. Auditoria de indicadores

- Rastrear filtros e denominador do escoamento do padrão Alto, conciliando estoque e vendas médias mensais no mesmo universo e período.
- Auditar preço médio geral e por dormitório: fonte de preço e área privativa, ponderação pela oferta ativa, classificação, duplicações e cobertura. O código já contém ponderação por estoque em partes do relatório; identificar a divergência antes de trocar a fórmula.
- Investigar lacunas de 2T2023 a 4T2024 e restaurar apenas valores sustentados pela fonte, sem interpolação nem preenchimento com zero.
- Tratar 14 meses, R$ 15.773/m² e os demais valores do documento como referências de conciliação, não como resultados a impor ao cálculo. Registrar diferenças remanescentes e sua evidência.

## 4. Mapas e fotos

- Ajustar o enquadramento amplo para a área urbana relevante sem descartar silenciosamente empreendimentos fora dela; explicitar quantidade exibida e cobertura georreferenciada.
- Conferir a normalização da densidade de VGV e sua renderização para obter verde, amarelo e vermelho conforme concentração, inclusive na aproximação central.
- Usar fotos HD fornecidas ou disponíveis nas fontes autorizadas; não inventar pessoas nem ampliar artificialmente avatares para declarar qualidade HD.

## Verificação e entrega

- Adicionar testes de regras numéricas e executar os testes existentes do relatório, incluindo regressões dos períodos de referência.
- Conferir prévia em tela grande e pequena, gráficos, mapas e exportação. Inspecionar textos, fontes e objetos no arquivo PowerPoint gerado.
- Para conciliação real, usar acesso autorizado aos dados e relatório manual de referência; sem esses acessos, registrar o limite e não declarar os indicadores homologados.
- Registrar alterações e evidências no documento vivo do Rebrain e na documentação do relatório. Não chamar IA, publicar, consumir consultas pagas nem escrever no Monday como parte da preparação deste plano.

## Dependências e detalhes técnicos

- Implementação concentrada em `src/features/relatorios-institucionais/sp/`, reaproveitando o gerador e exportador existentes.
- Conferir o conteúdo pelo título: a numeração citada no anexo difere da composição atual em alguns pontos.
- A conciliação numérica pode exigir dados reais e o PPTX manual; a atualização das fotos exige originais em alta resolução.
- A sessão está em uma branch gerenciada pelo Lovable, não em `main`. Não executar comandos de troca, sincronização ou publicação Git manualmente; integração depende do fluxo gerenciado da plataforma.
- O plano pendente de sincronização de Empresas foi preservado separadamente e não faz parte desta entrega.