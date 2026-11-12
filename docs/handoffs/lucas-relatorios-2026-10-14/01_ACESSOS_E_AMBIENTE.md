# Acessos e ambiente — comprovar, não presumir

## Evidência disponível em 14/10

Conta identificada como a de Lucas pelo handoff Quanti de setembro: `Kriptonyano`. Consulta administrativa read-only ao GitHub retornou no repo `GabeBrain/relatorios-api`: `permission=write`, `role_name=write`, `pull=true`, `push=true`, `admin=false`. Não fizemos push de prova nem alteramos permissões.

O handoff anterior está em outro repo: `Sistema-Quanti/Sistema Novo/Detalhes de Desenvolvimento/Docs/handoff-2026-09-04-diagnostico-lucas.md` e variante `-notebook.md`. Reaproveitar **a disciplina** OK/FALHA/NÃO TESTADO + saída sanitizada, não credenciais/regras daquele sistema. A role histórica `lucas_readonly` tinha validade 15/10; não a reutilizar nem renovar para relatórios. Nenhum banco direto/credencial de serviço é necessário para começar este piloto.

## Checklist na máquina do Lucas

Preencher na seção de ambiente de [STATUS](STATUS.md), com data/máquina/conta. Nunca colar segredo. Resultado na máquina de Gabriel não substitui resultado na máquina do Lucas.

1. Repo correto: `git remote -v`, `git branch --show-current`, `git status --short`, `git fetch --all`; comparar cada remoto. Clonar `https://github.com/GabeBrain/relatorios-api.git` apenas se ainda não houver cópia. Não criar outra cópia desnecessária. Em main limpa/atrás, somente fast-forward; árvore suja/divergência pede decisão antes da integração, sem reset/stash automático.
2. Node/npm: `node --version`, `npm.cmd --version`; dependências pelo lockfile, `npm.cmd ci` se necessário. Não gerar novo lockfile para contornar erro. PowerShell pode bloquear `.ps1`: usar `.cmd`, sem afrouxar política global.
3. Diagnóstico local rápido: `node scripts/handoffs/relatorios-preflight.mjs`. Não instala dependências, não chama API, não gera PDF, não lê valores de `.env`, não escreve arquivos.
4. GitHub opcional: acrescentar `--github` ao comando, se `gh` estiver autenticado. Usa a **conta da máquina dele** e leitura de permissões do repo; token nunca é impresso. Se conta não for a esperada, não concluir que Lucas tem acesso por usar a conta de Gabriel.
5. Drive: abrir a [pasta de modelos](https://drive.google.com/drive/folders/139aKOxC4clvhHe0uXsRJ8lhdIK5cdaYA), baixar/ler um PPTX SP e registrar sucesso. Conector opcional, não requisito para programar: sem conector, download manual com conta própria em `.local-inputs/relatorios-lucas/`. Se sem acesso, registrar o erro concreto; não solicitar material novo antes de tentar os links existentes.
6. Rebrain/Geobrain: abrir `/rebrain/panorama-secovi-fiergs` no ambiente que ele já usa. Login pessoal no bloco de autenticação, token temporário no `auth-store`, TTL local 180 min. Checar catálogo de cidades, filtro UF/cidade e um escopo SP autorizado **antes** de coleta. Não usar conta/token/senha de Gabriel nem completar catálogo com IBGE quando houver falha.
7. Mapas: verificar somente presença/configuração de `VITE_MAPBOX_ACCESS_TOKEN`, sem imprimir valor. Ausência não impede estudar contrato, mas impede aprovar o fundo dos mapas. Token público não é autorização para compartilhar outras credenciais.
8. Lovable: Lucas confirmar que consegue ver/publicar o projeto com sua conta. `write` no GitHub não prova permissão Lovable; publicação somente com autorização explícita. Não conceder acessos por agente nesta tarefa.

As variáveis `GEOBRAIN_EMAIL`, `GEOBRAIN_PASSWORD` ou `GEOBRAIN_TOKEN` são usadas por scripts de diagnóstico autenticado, não exigidas para os testes offline. Se houver ensaio autorizado, configurar pelo canal seguro/pessoal apropriado; sem valores em documentação/transcript. Login no site e credenciais dos scripts não são a mesma evidência de acesso.

## Falhas comuns

`Cannot read directory ../../..` antes de carregar Vite/Vitest pode ser restrição do sandbox, como no diagnóstico antigo de Lucas. Registrar essa causa separada de falha de teste; executar fora do isolamento somente com aprovação, ou no terminal pessoal, colando saída sanitizada. Não desligar controles de segurança permanentemente.

Acesso negado ao GitHub/Drive/Lovable/token não se resolve reinstalando o motor. Manter as etapas offline e enviar a Gabriel uma lista curta de permissões realmente faltantes. Não há necessidade de acesso ao ADM, banco Quanti, service-role, painel Supabase ou dados de RH para assumir estes relatórios.
