# Guidelines de Frontend — Rebrain

Este documento transforma o [Design System](./DESIGN_SYSTEM.md) em um contrato de implementação.
O Design System define a identidade visual; estas guidelines definem **como uma funcionalidade se
comporta, é estruturada e evolui**. Aplicam-se a qualquer autor: Lovable, Codex, equipe interna ou
outra integração.

## 1. Princípios

1. **Coerência antes de novidade.** Reutilize padrões e componentes existentes antes de criar uma
   variação visual ou comportamental.
2. **Uma feature é dona do seu domínio.** Regra de negócio, hooks e componentes específicos ficam
   em `src/features/<feature>/`; somente abstrações realmente reutilizáveis vão para `src/components/`
   ou `src/features/shared/`.
3. **Estados fazem parte da interface.** Carregando, vazio, erro, indisponibilidade de escopo e
   sucesso são estados do produto — não casos de exceção ocultos.
4. **Evolução incremental.** Não faça refatoração visual ampla só para atender a este documento.
   Aplique o padrão quando criar ou tocar uma funcionalidade.

## 2. Arquitetura de feature e componentes

```text
src/features/<feature>/
  pages/          # composição de rota; pouco estado de domínio
  components/     # blocos específicos da feature
  hooks/          # orquestração de dados e estado de tela
  lib/            # regras puras, adaptadores e cálculos
  types.ts        # contratos da feature
  api.ts          # fronteira de API, quando existir
```

- Use `src/components/ui/` para os primitives shadcn já disponíveis; não recrie `Button`, `Dialog`,
  `Input`, `Table`, `Tabs`, `Tooltip` ou `Skeleton` localmente.
- Promova um componente para `src/components/` apenas quando tiver uso real em duas ou mais features
  ou quando for parte deliberada do shell da plataforma.
- CSS específico pode ficar junto da feature, com classes prefixadas pelo módulo. Cores, bordas,
  espaçamentos e tipografia devem usar tokens do Design System, e não valores visuais novos sem
  justificativa.

## 3. Rotas, lazy-loading e recuperação de falha

**Regra padrão:** uma página de feature é carregada com `lazy()` na rota. Shell, providers globais e
páginas realmente leves podem continuar eager. O estado atual em `App.tsx` é parcial: Corretor e
Atualizador VGV já são lazy; Dashboard GeoBrain, Área Quanti, Secovi, API Explorer e legado devem
migrar apenas quando forem tocados ou em uma tarefa dedicada de performance.

Para uma rota lazy:

- use fallback contextual, e não uma tela genérica sem contexto;
- preserve rota antiga com redirect quando houver mudança pública de caminho;
- mantenha a falha recuperável: mensagem humana, ação “Tentar novamente” e sem expor detalhes
  técnicos ao usuário final;
- não carregue datasets grandes no módulo inicial se puderem ser buscados ou importados sob demanda.

## 4. Contrato de experiência de página

Toda página que consulta, processa ou filtra dados precisa prever explicitamente:

| Estado | Comportamento mínimo |
|---|---|
| Carregando | Skeleton/spinner contextual; preservar estrutura e evitar salto excessivo. |
| Vazio | Dizer o que não foi encontrado e orientar a próxima ação possível. |
| Erro | Explicar impacto em linguagem clara, oferecer nova tentativa e não usar fallback silencioso. |
| Escopo inválido | Bloquear chamada pesada e orientar o dado/filtro que falta. |
| Sucesso | Mostrar origem/recorte do dado quando isso muda a interpretação. |

Em telas de filtro, trocar um filtro pai limpa opções filhas incompatíveis. Em operações demoradas,
o botão deve indicar progresso e não aceitar submissões duplicadas.

## 5. Hierarquia visual e interação

- Um contexto de decisão tem **uma ação primária**; ações secundárias usam variante discreta.
- Ações destrutivas pedem confirmação; ações irreversíveis explicam a consequência antes dela.
- Rótulos descrevem a ação (“Exportar recorte”), não apenas o mecanismo (“CSV”).
- Cor nunca é a única forma de comunicar estado: acrescente texto, ícone, valor ou padrão visual.
- Use `Tooltip` para explicar ícones e métricas; não esconda ação essencial exclusivamente em tooltip.
- Gráficos e tabelas devem indicar unidade, período/recorte e como ler a métrica quando houver risco
  de ambiguidade.

## 6. Responsividade, temas e acessibilidade

Antes de considerar uma interface pronta, verifique desktop e mobile, tema claro e escuro, foco por
teclado, rótulo associado a campos e contraste dos estados. Ícones decorativos não precisam de nome;
ícones que acionam ação precisam de `aria-label` ou texto acessível. Não use placeholder como único
rótulo de campo.

## 7. Ritual para assistentes e revisores

Antes de alterar frontend, o assistente deve:

1. Classificar o pedido: ajuste visual, componente, página de dados ou feature completa.
2. Consultar este documento, o Design System e os componentes próximos à feature.
3. Declarar no handoff qual padrão foi reutilizado e quais estados foram cobertos.
4. Registrar em [FRONTEND_DECISIONS.md](./FRONTEND_DECISIONS.md) apenas exceções duradouras:
   novo primitive compartilhado, desvio de lazy-loading, novo token ou mudança de padrão de fluxo.

Não se cria uma decisão para cada ajuste pequeno. Uma decisão deve informar contexto, escolha,
consequência e os módulos afetados.

## 8. Checklist de pronto

- [ ] Reutilizei primitives/tokens existentes ou documentei a exceção.
- [ ] Cobri carregando, vazio, erro e escopo inválido quando aplicável.
- [ ] A rota nova é lazy ou a exceção está registrada.
- [ ] Verifiquei claro/escuro e desktop/mobile.
- [ ] Rodei typecheck, lint/build e testes proporcionais ao risco.
- [ ] Atualizei o documento vivo do ambiente quando o fluxo/comportamento mudou.
