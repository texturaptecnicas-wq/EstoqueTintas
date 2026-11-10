import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, MonitorSmartphone, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { ACESSO } from '@/config/acesso';

// Só deixa o app abrir em aparelhos ativados.
// Cada aparelho é ativado uma vez com a senha interna; a sessão fica salva
// e se renova sozinha, então no dia a dia o app abre direto.
const AtivacaoGate = ({ children }) => {
  const [estado, setEstado] = useState('carregando'); // carregando | ativado | pendente
  const [senha, setSenha] = useState('');
  const [nomeAparelho, setNomeAparelho] = useState(
    () => localStorage.getItem(ACESSO.chaveNomeAparelho) || ''
  );
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEstado(session ? 'ativado' : 'pendente');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      setEstado(session ? 'ativado' : 'pendente');
    });
    return () => subscription.unsubscribe();
  }, []);

  const ativar = async (e) => {
    e.preventDefault();
    if (!nomeAparelho.trim()) {
      setErro('Dê um nome para este aparelho (ex.: PC comercial).');
      return;
    }
    setEnviando(true);
    setErro('');
    const { error } = await supabase.auth.signInWithPassword({
      email: ACESSO.emailConta,
      password: senha,
    });
    setEnviando(false);
    if (error) {
      setErro('Senha incorreta. Confira e tente de novo.');
      setSenha('');
      return;
    }
    localStorage.setItem(ACESSO.chaveNomeAparelho, nomeAparelho.trim());
  };

  if (estado === 'carregando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (estado === 'ativado') return children;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-sm">
            <MonitorSmartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Ativar aparelho</h1>
          <p className="text-gray-600">Feito uma única vez em cada aparelho da {ACESSO.nomeEmpresa}.</p>
        </div>

        <form onSubmit={ativar} className="bg-white border border-gray-200 shadow-sm p-6 rounded-xl space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4" />
              Nome deste aparelho
            </label>
            <input
              type="text"
              value={nomeAparelho}
              onChange={(e) => setNomeAparelho(e.target.value)}
              placeholder="Ex.: PC comercial, celular cabine 1"
              className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Senha de ativação
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha..."
              className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              autoFocus
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            disabled={enviando || !senha}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Ativando...' : 'Ativar aparelho'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AtivacaoGate;
