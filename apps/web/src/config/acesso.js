// Configuração de acesso desta empresa (dados, não lógica).
// Para usar a mesma tela de ativação em outra empresa, troque só estes valores.
export const ACESSO = {
  emailConta: 'aparelhos@textura.invalid',
  nomeEmpresa: 'Textura',
  chaveNomeAparelho: 'nomeAparelho',
};

// Limpa o cache do navegador sem desativar o aparelho:
// mantém a sessão do Supabase (chaves sb-*) e o nome do aparelho.
export const limparCacheMantendoAtivacao = () => {
  Object.keys(localStorage)
    .filter((k) => !k.startsWith('sb-') && k !== ACESSO.chaveNomeAparelho)
    .forEach((k) => localStorage.removeItem(k));
};
