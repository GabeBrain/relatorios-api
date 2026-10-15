# Retirada da landing legada — 15/10/2026

## Entrega
- A captura enviada correspondia à landing dentro de CorretorV3Page, ainda alcançável por Novo estudo. Removida sua lista operacional e menus de gerações; carteira única em `/corretor`.
- `/corretor/novo` usa tokens SE e composição da carteira, apresentação PPTX com Excel opcional abaixo; modo consultivo preservado como ação secundária. PDF continua prévia da bancada, não novo formato de ingestão.
- `/corretor/analise` sem estudo redireciona para novo envio. Com estudo segue rota canônica. Links `/auditoria` e `/auditoria/v2` continuam encaminhando à carteira nova.
- Removida a alternativa de lista legada da revisão, inclusive quando URL contém `layout=list`. Bancada mantém os mesmos achados, decisões e filtros; histórico e materiais persistentes não foram apagados.
- Fonte escolhida no novo envio é capturada, salva no novo estudo e usada pela pré-análise. Antes a seleção era limpa ao ingerir o PPTX. Sem mudança em cálculo, modelos ou aprovação de custo.

## Validação e limites
Tipagem aprovada. ESLint sem erros, um aviso preexistente de dependência groupOf. Build concluído em21,54s, avisos de bundle/Browserslist preexistentes. Chromium local com backend inteiramente interceptado: cinco rotas de entrada, retorno preservando filtro, troca do modo consultivo, Excel opcional e bancada forçada em URL antiga; capturas1440/390/320. Zero escrita remota, zero chamadas de funções/IA. Materiais e decisões reais não foram reprocessados; dez passes anteriores não foram repetidos nesta alteração de composição. Nenhuma migration ou função nova nesta fatia. Não declara integração A2/A3 completa nem produção verificada.

## Próximo passo
Push autorizado por Gabriel; após atualização Lovable, conferir Novo estudo e reabrir estudo existente, inclusive por favorito antigo. Ativação dos componentes de persistência preparados na sessão anterior segue dependência separada.

Evidência local ignorada: `.local-inputs/a1-browser-1792079484681/unified-result.json` e capturas `new-1440.png`, `new-390.png`, `new-320.png`. Largura útil móvel conferida após animação do shell, sem depender apenas de ausência de overflow.
