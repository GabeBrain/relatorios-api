# SP Institucional — casos para validação da fonte

03/11/2026 · 2T2026 · Codex · material preparado para encaminhamento humano, sem mensagem externa enviada.

## Texto para encaminhar

Após integrar o histórico da API v2 ao SP Institucional, o checklist do2T2026 passou de59 para68slides disponíveis. Permanecem2bloqueados e7parciais, além de8referências editoriais. Precisamos validar os casos abaixo na origem e confirmar a semântica dos campos; não alteramos os valores recebidos para forçar reconciliação.

**1. Estoque histórico negativo — empreendimento26686, tipologia33487.** A resposta individual recebida apresenta `typology_stock=-1` em diversas competências, inclusive mar/abr/mai2026, passando a0 emjun2026. O checklist após coleta v2 ainda aponta estoque inválido nessas competências. Isso impede o IVV por área (slide51, que usa abertura do trimestre) e vários pontos das séries de preços53–59. Confirmar se−1 é erro cadastral, marcador de informação indisponível ou algum ajuste com significado específico, e qual fonte/valor deve ser utilizado. Na resposta individual, jun2026 também mostra qty8/sold15/estoque0: confirmar o significado de qty e sold nessa fotografia.

**2. Fotografia ausente — empreendimento64094, tipologia117449.** Lançamento informado emmai2023, histórico individual iniciando emjul2023. A competênciajun2023 está ausente; o checklist v2 mantém essa lacuna. Precisamos da fotografia correspondente ou da confirmação formal de sua indisponibilidade e do universo aplicável. Não usamos o preço de julho para preencher junho.

**3. Campo sold e conciliação de capacidade — empreendimento87999, jun2026, comprovado na resposta v2.** O slide78 atualmente trata sold como vendido acumulado e exige qty=sold+typology_stock. Estes registros não atendem a essa identidade:

| Tipologia | qty | sold | Estoque | qty − sold − estoque | distractions |
|---|---:|---:|---:|---:|---:|
| 150368 | 120 | −9 | 119 | 10 | 10 |
| 150369 | 120 | −11 | 120 | 11 | 11 |
| 150370 | 96 | −6 | 96 | 6 | 6 |

Nessas três linhas, gross_sales=distractions e sold_in_period=0, portanto o fluxo líquido mensal informado é consistente com bruto menos distratos. A diferença na identidade de capacidade coincide com distractions. Isso é uma observação aritmética, não prova de duplicação de distratos ou erro do backend.

**Perguntas objetivas:** sold deve representar vendido acumulado líquido nessa fotografia? Já inclui algum abatimento adicional de distratos? qty é capacidade atual ou quantidade original? Qual campo/regra deve alimentar vendido acumulado e VGV vendido do slide78? Se o contrato exigir qty=sold+estoque, validar/corrigir esses registros na origem. Se a semântica for outra, documentá-la para adaptar o consumidor sem substituir números por inferência.

## Evidência e limites

- Checklist fornecido pelo usuário:03/11/2026,19:30:18.195UTC,2T2026 completo atéjunho, fonteapi.68disponíveis/7parciais/2bloqueados/8referências. Disponibilidade não equivale a homologação.
- Resposta v2 fornecida pelo usuário: página1/100empreendimentos,5.229totais/53páginas, SHA256 `a52a81d25d36aa6621dd5ad23df615e41de023fe8b04b0ad07f39bb470da5635`. Contém87999 e os registros acima; não contém26686 ou64094. Os dois primeiros casos têm resposta individual legada e diagnóstico posterior da coleção v2.
- É uma lista de exemplos comprovados, não de todas as ocorrências da coleção. Não houve nova consulta autenticada pelo agente nem escrita na API. Credenciais, contatos internos e payload bruto não estão neste documento.
- Relatório agora identifica as falhas do78 por empreendimento/tipologia/competência e valores; checklist inclui as ocorrências do fechamento no resumo de fonte. Estoque negativo permanece negativo no diagnóstico e continua inválido para os cálculos atuais; não vira ausência ou zero silenciosamente.
- Decisão sobre aceitar uma metodologia alternativa ou dados parciais para publicação depende da validação da fonte e da revisão analítica. [Método e evidências técnicas](EVIDENCIAS.md).
