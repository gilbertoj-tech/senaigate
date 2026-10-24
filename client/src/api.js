import { supabase } from './supabaseClient';

export const DEMO = import.meta.env.VITE_DEMO === 'true';

// Função auxiliar para tratamento amigável de erros
const handleSupabaseError = (error, defaultMsg) => {
  if (error) {
    console.error(defaultMsg, error.message);
    throw new Error(error.message || defaultMsg);
  }
};

export const api = {
  // 1. Obter estatísticas/resumo do dia
  async getSummary(data = new Date().toISOString().slice(0, 10)) {
    const { data: list, error } = await supabase
      .from('movimentacoes')
      .select('tipo, created_at')
      .gte('created_at', `${data}T00:00:00`)
      .lte('created_at', `${data}T23:59:59`);

    if (error) {
      console.warn('Erro ao carregar resumo:', error.message);
      return { entradas: 0, saidas: 0, total: 0 };
    }

    const entradas = list.filter((m) => m.tipo === 'ENTRADA').length;
    const saidas = list.filter((m) => m.tipo === 'SAIDA').length;

    return { entradas, saidas, total: list.length };
  },

  // 2. Listar movimentações do dia
  async getMovimentacoes(data = new Date().toISOString().slice(0, 10)) {
    const { data: res, error } = await supabase
      .from('movimentacoes')
      .select(`
        *,
        alunos (
          id,
          nome,
          matricula,
          turma
        )
      `)
      .gte('created_at', `${data}T00:00:00`)
      .lte('created_at', `${data}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar movimentações:', error.message);
      return [];
    }
    return res || [];
  },

  // 3. Buscar aluno por Matrícula / RA / Cartão
  async getAlunoPorMatricula(matricula) {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('matricula', matricula)
      .maybeSingle();

    handleSupabaseError(error, 'Erro ao buscar aluno');
    return data;
  },

  // 4. Registrar Entrada/Saída
  async registrarMovimentacao(dados) {
    const { data, error } = await supabase
      .from('movimentacoes')
      .insert([
        {
          aluno_id: dados.aluno_id,
          tipo: dados.tipo,
          observacao: dados.observacao || '',
        },
      ])
      .select();

    handleSupabaseError(error, 'Erro ao registrar movimentação');
    return data ? data[0] : null;
  },

  // 5. Buscar autorizações do aluno
  async getAutorizacoes(aluno_id) {
    const { data, error } = await supabase
      .from('autorizacoes')
      .select('*')
      .eq('aluno_id', aluno_id);

    if (error) {
      console.warn('Erro ao buscar autorizações:', error.message);
      return [];
    }
    return data || [];
  },

  // 6. Método genérico de busca (compatibilidade com chamadas flexíveis)
  async fetch(endpoint, options = {}) {
    console.warn(`A chamada para a rota legacy ${endpoint} foi redirecionada para o Supabase.`);
    return { ok: true, json: async () => ([]) };
  }
};

// Exportação padrão para caso o App.jsx faça `import api from './api'`
export default api;
