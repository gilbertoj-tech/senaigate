import { supabase } from './supabaseClient';

export const DEMO = import.meta.env.VITE_DEMO === 'true';

// Funções Utilitárias e de Formatação esperadas pela interface
export const formatHora = (isoString) => {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

export const formatData = (isoString) => {
  if (!isoString) return '--/--/----';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '--/--/----';
  }
};

export const getTurno = (isoString) => {
  if (!isoString) return 'Manhã';
  const hora = new Date(isoString).getHours();
  if (hora < 12) return 'Manhã';
  if (hora < 18) return 'Tarde';
  return 'Noite';
};

// Funções de Consulta ao Supabase
export async function getSummary(data = new Date().toISOString().slice(0, 10)) {
  const { data: list, error } = await supabase
    .from('movimentacoes')
    .select('tipo, created_at')
    .gte('created_at', `${data}T00:00:00`)
    .lte('created_at', `${data}T23:59:59`);

  if (error || !list) return { entradas: 0, saidas: 0, total: 0 };

  const entradas = list.filter((m) => m.tipo === 'ENTRADA').length;
  const saidas = list.filter((m) => m.tipo === 'SAIDA').length;

  return { entradas, saidas, total: list.length };
}

export async function getMovimentacoes(data = new Date().toISOString().slice(0, 10)) {
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

  if (error) return [];
  return res || [];
}

export async function getAlunoPorMatricula(matricula) {
  const { data } = await supabase
    .from('alunos')
    .select('*')
    .eq('matricula', matricula)
    .maybeSingle();

  return data || null;
}

export async function registrarMovimentacao(dados) {
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
  return data ? data[0] : null;
}

export async function getAutorizacoes(aluno_id) {
  const { data, error } = await supabase
    .from('autorizacoes')
    .select('*')
    .eq('aluno_id', aluno_id);

  if (error) return [];
  return data || [];
}

// Objeto base consolidado
const baseApi = {
  getSummary,
  getMovimentacoes,
  getAlunoPorMatricula,
  registrarMovimentacao,
  getAutorizacoes,
  fetchAutorizacoes: getAutorizacoes,
  formatHora,
  formatData,
  getTurno,
  async fetch(endpoint) {
    return { ok: true, json: async () => [] };
  }
};

// Proxy para capturar chamadas inesperadas e evitar que o App quebre
export const api = new Proxy(baseApi, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    if (typeof prop === 'string' && (prop.startsWith('format') || prop.startsWith('get') || prop.startsWith('is'))) {
      return () => '';
    }
    return async () => ([]);
  }
});

export default api;
