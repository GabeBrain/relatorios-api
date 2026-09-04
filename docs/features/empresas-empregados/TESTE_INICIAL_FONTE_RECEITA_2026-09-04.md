# Teste inicial — Fonte Receita Federal para Empresas

**Data:** 2026-09-04  
**Escopo:** disponibilidade, manifesto e resolução municipal da fonte CNPJ.  
**Não realizado:** download nacional, processamento de estabelecimentos, persistência, batch ou interface de Empresas.

## Resultado

O compartilhamento WebDAV público documentado em `DEVELOPMENT.md` respondeu `207 Multi-Status`,
o status esperado para `PROPFIND`. A fonte contém 40 competências de `2023-05` até `2026-08`;
portanto, **2026-08 é o mês mais recente disponível no momento do teste**.

O manifesto de `2026-08` contém todos os arquivos necessários ao pipeline descrito por Diego:

- 10 `Estabelecimentos*.zip`;
- 10 `Empresas*.zip`;
- `Simples.zip`;
- `Municipios.zip`.

## Dimensionamento inicial do insumo

Os tamanhos declarados pelo WebDAV para os 22 arquivos mínimos somam **6,52 GiB**:

| Grupo | Arquivos | Volume compactado |
|---|---:|---:|
| Estabelecimentos | 10 | 4,97 GiB |
| Empresas | 10 | 1,27 GiB |
| Simples | 1 | 0,28 GiB |
| Municípios | 1 | 43 KB |
| **Total** | **22** | **6,52 GiB** |

Conclusão: Empresas precisa de job/batch controlado e cache de artefatos; não deve baixar ou
processar esses arquivos dentro de Edge Function, a cada clique ou em navegação web.

## Validação do código municipal Receita

`Municipios.zip` foi lido somente em memória (43 KB), com encoding Windows-1252. Confirmações:

| Município | UF | Código Receita | Evidência |
|---|---|---:|---|
| Blumenau | SC | `8047` | linha `"8047";"BLUMENAU"` |
| Rio Verde | GO | `9571` | linha `"9571";"RIO VERDE"` |

O arquivo também contém municípios homônimos/parciais como `RIO VERDE DE MATO GROSSO` e
`LUCAS DO RIO VERDE`. Logo, a resolução do futuro pipeline deve exigir nome normalizado + UF,
validar o código contra a tabela Receita e manter uma tabela auxiliar código/nome/UF; nunca usar
IBGE diretamente nem aceitar somente busca textual.

## Próximo gate

Para reproduzir Blumenau e Rio Verde de forma confiável, falta o código-fonte original de
`cnpj_blumenau.py` e `exportar_xlsx.py` (ou uma especificação equivalente das regras de setor e
porte). O `DEVELOPMENT.md` descreve as regras, mas não fornece o mapeamento `GRANDES_GRUPOS` nem
os limites completos de `classificar_porte()`. Não é seguro inferi-los para uma comparação de aceite.

Quando esse insumo estiver disponível, o próximo teste deve:

1. executar os dois municípios para uma mesma competência;
2. medir download, tempo, pico de memória e espaço temporário;
3. comparar matriz setor × porte e totais com os artefatos de Diego;
4. decidir o tamanho/configuração de um Cloud Run Job e a política de cache mensal.
