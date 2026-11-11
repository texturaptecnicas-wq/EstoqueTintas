# Estoque de Tintas (empresa de pintura eletrostática)

App interno de estoque: tintas e insumos, colunas configuráveis, cores/legendas por célula, alertas de recompra e histórico de preços. Sincroniza em tempo real.

## Comandos
- Rodar local: `npm run dev` (porta 3000) · Build: `npm run build` (saída em `dist/apps/web`) · Lint: `npm run lint`
- O código do app fica em `apps/web/src` (lógica de dados nos hooks em `src/hooks`).

## Regra nº 1: nunca quebrar o que está em uso
- Toda mudança em ramo separado, nunca direto na `main`. Testar na versão de teste (preview) da Vercel antes de juntar.
- Antes de mudar algo, ler o que depende daquilo.
- Nenhuma mudança no banco de produção (Supabase) sem aprovação explícita do Lucas. Mudança de regra/estrutura do banco: salvar antes o script de volta.
- Conferir depois de mudar; não confiar só em "salvo".

## Acesso e segurança (não desfazer)
- Sem tela de login: cada aparelho é ativado uma vez (`src/components/AtivacaoGate.jsx`) com a conta interna `aparelhos@textura.invalid`; a sessão fica salva.
- Banco: todas as tabelas só aceitam usuário autenticado (RLS).
- Nunca usar `localStorage.clear()`: para limpar cache use `limparCacheMantendoAtivacao()` de `src/config/acesso.js` (mantém a sessão `sb-*` e `nomeAparelho`).
- Dados da empresa ficam em `src/config/acesso.js`, separados da lógica.

## Convenções
- Textos da interface e mensagens de commit em português.
- Repositório em pasta do OneDrive com quebra de linha Windows: manter `core.autocrlf=true`.
