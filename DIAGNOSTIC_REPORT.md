
# Relatório de Diagnóstico Técnico - ERP Estoque

## 1. INVESTIGAÇÃO: Botão Limpar (SearchBar)

### Problema Identificado
O botão "Limpar" (X) na barra de pesquisa não estava resetando corretamente o estado de busca no contexto da paginação, e a arquitetura de busca atual (Client-Side) conflita com o carregamento parcial de dados (Server-Side Pagination).

### Análise Detalhada
- **Arquivo:** `src/components/SearchBar.jsx` & `src/pages/HomePage.jsx`
- **Fluxo Atual:** 
  1. Usuário clica em "X".
  2. `onClear` chama `setSearchQuery('')`.
  3. `useEffect` aguarda 300ms (debounce).
  4. `debouncedSearch` torna-se `''`.
  5. `filteredProducts` retorna `products` completo (mas apenas a página atual carregada).
- **Falha Crítica:** A lógica `!debouncedSearch` usada para controlar o botão "Carregar Mais" (`hasMore && !debouncedSearch`) cria um estado inconsistente onde o usuário pode ficar "preso" em uma visualização filtrada se a limpeza não disparar um refetch ou resetar a paginação corretamente.
- **Correção Necessária:** O `onClear` deve não apenas limpar o texto, mas garantir que a tabela retorne ao estado inicial de paginação (Página 0) se necessário, ou garantir que a UX de "Carregar Mais" reapareça instantaneamente.

## 2. INVESTIGAÇÃO: Ordem do Excel (Import)

### Problema Identificado
A ordem visual dos produtos na tabela não corresponde à ordem das linhas no arquivo Excel importado.

### Análise Detalhada
- **Arquivo:** `src/hooks/useImport.js` e `src/hooks/useProducts.js`
- **Causa Raiz 1 (Extração):** O `order_index` é calculado corretamente durante a leitura do arquivo (`absoluteIndex`).
- **Causa Raiz 2 (Inserção):** A inserção no banco é feita via `Promise.all` com processamento paralelo de batches. Isso faz com que o campo `created_at` (timestamp) seja aleatório na faixa de milissegundos, dependendo de qual promessa resolve primeiro.
- **Causa Raiz 3 (Recuperação):** A query `getProducts` utiliza `.order('created_at', { ascending: false })`. Como o `order_index` está aninhado dentro de um campo JSONB (`data->order_index`), o Supabase não o utiliza para ordenação nativa na query principal.
- **Impacto:** O frontend tenta ordenar localmente (`formattedProducts.sort`), mas como ele recebe apenas 50 itens por vez (paginação) ordenados por data (que está misturada devido à inserção paralela), a ordem global fica fragmentada.
- **Correção Necessária:** Implementar inserção em Batch único (Atomic Insert) para preservar a sequência de IDs/Timestamps e alterar a estratégia de ordenação para priorizar a ordem de inserção (ASC) ou implementar ordenação por JSONB.

## 3. INVESTIGAÇÃO: Performance e Lentidão

### Problema Identificado
A aplicação apresenta lentidão perceptível ao editar células e navegar, causada por re-renderizações excessivas ("Re-render Storm").

### Análise Detalhada
- **Arquivo:** `src/hooks/useProducts.js` e `src/components/ProductTable.jsx`
- **Vazamento de Performance:** A função `updateProduct` tem o array `products` como dependência no `useCallback`:
  