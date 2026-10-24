import { supabase } from './supabaseClient';

export const DEMO = import.meta.env.VITE_DEMO === 'true';

export const api = {
  async getSummary(data = new Date().toISOString().slice(0, 10)) {
    const { data: movimentacoes, error } = await supabase
      .from('movimentacoes')
      .select('tipo, created_at')
      .gte('created_at', `${data}T00:00:00`)
      .lte('created_at', `${data}T23:59:59`);

    if (error) throw error;

    const entradas = movimentacoes.filter((m) => m.tipo === 'ENTRADA').length;
    const saidas = movimentacoes.filter((m) => m.tipo === 'SAIDA').length;

    return { entradas, saidas, total: movimentacoes.length };
  },

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

    if (error) throw error;
    return res;
  },

  async getAlunoPorMatricula(matricula) {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('matricula', matricula)
      .single();

    if (error) throw error;
    return data;
  },

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

    if (error) throw error;
    return data[0];
  },

  async getAutorizacoes(aluno_id) {
    const { data, error } = await supabase
      .from('autorizacoes')
      .select('*')
      .eq('aluno_id', aluno_id);

    if (error) throw error;
    return data;
  },
};
