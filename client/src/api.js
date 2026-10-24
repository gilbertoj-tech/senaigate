import { supabase } from './supabaseClient';

export const DEMO = import.meta.env.VITE_DEMO === 'true';

// Método utilitário para chamadas seguras
const safeQuery = async (queryPromise, fallback = []) => {
  try {
    const { data, error } = await queryPromise;
    if (error) {
      console.warn('Supabase query notice:', error.message);
      return fallback;
    }
    return data || fallback;
  } catch (err) {
    console.warn('Supabase catch notice:', err);
    return fallback;
  }
};

// 1. Funções individuais (Named Exports)
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
  return await safeQuery(
    supabase
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
      .order('created_at', { ascending: false }),
    []
  );
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
  return await safeQuery(
    supabase.from('autorizacoes').select('*').eq('aluno_id', aluno_id),
    []
  );
}

export async function fetchApi(endpoint) {
  console.warn(`Rota remota chamada: ${endpoint}`);
  return { ok: true, json: async () => [] };
}

// 2. Objeto principal agrupado (Para a importação `import { api }`)
export const api = {
  getSummary,
  getMovimentacoes,
  getAlunoPorMatricula,
  registrarMovimentacao,
  getAutorizacoes,
  fetch: fetchApi,
};

// 3. Proxy de segurança para evitar "is not a function" se o App.jsx chamar alguma função com nome diferente
const apiHandler = {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    // Caso o App.jsx tente chamar uma função que não existe no objeto:
    console.warn(`Atenção: A função api.${String(prop)}() foi chamada no App.jsx mas não existe no api.js.`);
    return async () => ([]);
  }
};

export const safeApi = new Proxy(api, apiHandler);

// Default Export
export default safeApi;
