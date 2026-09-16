-- Uma competência de cada fonte, sempre parametrizada pelo job.
WITH estabelecimentos AS (
  SELECT id_municipio, cnpj_basico, identificador_matriz_filial,
    SUBSTR(cnae_fiscal_principal, 1, 2) AS cnae_divisao
  FROM `basedosdados.br_me_cnpj.estabelecimentos`
  WHERE data = @estabelecimentos_particao
    AND situacao_cadastral = '02'
    AND id_municipio IS NOT NULL
), empresas AS (
  SELECT cnpj_basico, porte
  FROM `basedosdados.br_me_cnpj.empresas`
  WHERE data = @empresas_particao
), simples_atual AS (
  SELECT cnpj_basico,
    CASE WHEN opcao_mei = 1 THEN 'mei' WHEN opcao_simples = 1 THEN 'simples' ELSE 'nenhum' END AS regime_simples
  FROM `basedosdados.br_me_cnpj.simples`
)
SELECT
  CAST(e.id_municipio AS STRING) AS id_municipio,
  COALESCE(d.cnae_secao, 'ND') AS cnae_secao,
  COALESCE(p.porte, '00') AS porte,
  CAST(e.identificador_matriz_filial AS INT64) AS matriz_filial,
  COALESCE(s.regime_simples, 'nenhum') AS regime_simples,
  COUNT(*) AS quantidade
FROM estabelecimentos e
LEFT JOIN empresas p USING (cnpj_basico)
LEFT JOIN simples_atual s USING (cnpj_basico)
LEFT JOIN `{{CNAE_DIMENSION_TABLE}}` d ON d.cnae_divisao = e.cnae_divisao
GROUP BY 1, 2, 3, 4, 5
