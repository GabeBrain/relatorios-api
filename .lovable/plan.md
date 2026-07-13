Ajustar o Top-Header da página **Validação do Fechamento** (`/rebrain/validacao-fechamento`) para reproduzir o layout da imagem de referência, com os rótulos `UF`, `MUNICÍPIO` e `VISUALIZAÇÃO` alinhados no topo e os respectivos controles imediatamente abaixo, todos alinhados pela base.

```text
Referência (imagem):
UF         MUNICÍPIO                       VISUALIZAÇÃO
[ UF ▼ ]   [ Selecione a UF primeiro  ▼ ]  [ Ano | Trimestre | Mês/Ano ]
```

## O que será alterado

### 1. `src/features/validacao-fechamento/VFHeader.tsx`
- Manter o botão `☰ Filtros` à esquerda (fora do bloco de labels, pois não faz parte do padrão da imagem).
- Manter o `GeoApiScopeSelector` (já renderiza as labels `UF` e `Município` acima dos controles com o mesmo estilo `text-[10px] font-medium uppercase tracking-wide text-muted-foreground`).
- Corrigir o bloco de `Visualização`: hoje a label e o `vf-chip-group` estão no mesmo container `flex items-end`, ficando **lado a lado**. Precisa virar uma coluna (`flex flex-col gap-1.5`) para a label ficar **acima** dos chips, igual ao padrão dos outros seletores.
- Uniformizar a label com `text-[10px] font-medium uppercase tracking-wide text-muted-foreground` (já está) e o texto `Visualização` em caixa alta para casar com `UF` / `MUNICÍPIO`.
- Garantir que o container externo continue `flex flex-wrap items-end gap-3` para alinhar todos os controles pela base.

Estrutura final proposta:

```tsx
<header className="flex flex-wrap items-end gap-3 px-4 py-3 ...">
  <button className="vf-btn" onClick={onOpenSidebar}>☰ Filtros</button>

  <GeoApiScopeSelector value={scope} onChange={onScopeChange} className="flex-1 min-w-[320px]" />

  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Visualização
    </label>
    <div className="vf-chip-group">
      {GRANS.map(...)}
    </div>
  </div>
</header>
```

### 2. `src/features/validacao-fechamento/fechamento.css` (ajuste pontual, se necessário)
- Conferir se os chips (`vf-chip`, altura padrão) casam visualmente com os dropdowns `h-9` do `GeoApiScopeSelector`. Se necessário, forçar `height: 36px` nos `.vf-chip` dentro do header para alinhamento perfeito pela base.

### 3. Documentação
- Registrar o ajuste em `docs/projetos/LIVE_rebrain.md` (Desenvolvimentos + Etapas).

## Fora de escopo
- Nenhuma mudança em filtros, ordenação, tabela resumo ou lógica de agregação — apenas layout do header.
- Comportamento existente preservado (props, callbacks, persistência de sessão).

## Verificação
- Build sem erros.
- Preview em `/rebrain/validacao-fechamento` mostra `UF`, `MUNICÍPIO` e `VISUALIZAÇÃO` alinhados no topo, com os controles logo abaixo — igual à imagem de referência.
- Responsividade preservada (o header continua com `flex-wrap`).

## Arquivos afetados
- `src/features/validacao-fechamento/VFHeader.tsx`
- `src/features/validacao-fechamento/fechamento.css` (se necessário)
- `docs/projetos/LIVE_rebrain.md`