# Evidência da Fase 3 — política horizontal FIERGS 2T2026

## Resultado executivo

O universo horizontal homologável passa a conter somente `Loteamento Aberto`, `Loteamento Fechado` e `Condomínio de Casas/Sobrados`. `Condomínio de Chácaras` é reconhecido para auditoria, mas rejeitado na entrada tanto do contrato temporal quanto do cubo granular.

Na bancada autenticada das dez cidades, o resultado após a política é **129 empreendimentos**, **30.476 unidades lançadas** e **3.365 unidades finais**. A exclusão corresponde exatamente aos 2 empreendimentos, 110 unidades lançadas e 48 unidades finais apontados pela Juliana.

## Evidência por empreendimento

Os dois registros encontrados estão em Viamão e têm fotografia mais recente em junho de 2026:

| Building ID | Empreendimento | Oferta final | Resultado |
|---|---|---:|---|
| 63604 | Condomínio Pedra Rosada | 48 | rejeitado |
| 63127 | Encosta Do Lago - Etapa 1 | 0 | rejeitado |
| **Total** | **2 empreendimentos** | **48** | **fora do universo** |

Nenhuma outra grafia ou alias de chácaras foi encontrado nas demais nove cidades. O runtime resultante contém exclusivamente os subtipos `condominio_casas`, `loteamento_fechado` e `loteamento_aberto`.

## Reconciliação dos slides 63 e 64

Os slides por produto e por coorte agora consomem o mesmo cubo horizontal já filtrado. Uma regressão soma número de empreendimentos, oferta lançada e oferta final das linhas por produto e exige igualdade com a linha `Total geral` das coortes.

A janela de coorte é definida por todos os empreendimentos aceitos com lançamento até o fechamento selecionado, aqui **2T2026**. Não é uma janela móvel. Anos até 2022 são agrupados em `Até 2022`; 2023 em diante aparecem individualmente; `Subtotal lançados após 2024` agrega estritamente 2025 e 2026; `Total geral` reagrega todos os anos presentes. Projetos posteriores ao fechamento são rejeitados antes da agregação.

## Média dos loteamentos

A linha `Média dos loteamentos` usa somente projetos classificados como `loteamento_aberto` ou `loteamento_fechado`. Condomínios de casas não participam e chácaras já estão ausentes do cubo. Mínimo, média aritmética entre empreendimentos com preço válido e máximo são calculados sobre esse mesmo recorte, sem número digitado manualmente.

## Invariantes preservadas

- vendas verticais: `1.091` por padrão, tipologia, cidade e área;
- oferta final vertical: `5.251` por padrão, tipologia e área;
- horizontal homologável: 129 empreendimentos e 3.365 unidades finais;
- chácaras FIERGS no runtime: zero;
- produto horizontal = coorte horizontal para projetos, lançamentos e oferta final.

## Verificação

- bancada autenticada das dez cidades gravada localmente em `.tmp/fiergs-horizontal-policy-2T2026.json`;
- suíte completa da feature: `221/221` testes aprovados;
- testes de reconciliação produto × coorte e da média aberto + fechado;
- typecheck e build de produção aprovados; permaneceram apenas os avisos conhecidos de Recharts/JSDOM, Browserslist e tamanho de chunks.

## Estado do portão

A Fase 3 está **concluída tecnicamente**. O filtro solicitado pela Juliana foi aplicado transversalmente, sem iniciar os ajustes visuais da Fase 6.
