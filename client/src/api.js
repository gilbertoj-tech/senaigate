import { supabase } from './supabaseClient';

// ==========================================
// SERVIÇOS DE MOVIMENTAÇÃO (ENTRADA / SAÍDA)
// ==========================================

/**
 * Registra a entrada ou saída de um aluno.
 * @param {Object} dados - Objeto contendo { aluno_id, tipo, observacao }
 */
export async function registrarMovimentacao({ aluno_id, tipo, observacao = '' }) {
  const { data, error } = await supabase
    .from('movimentacoes')
    .insert([
      {
        aluno_id,
        tipo, // 'ENTRADA' ou 'SAIDA'
        observacao,
        data_hora: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    console.error('Erro ao registrar movimentação:', error.message);
    throw error;
  }

  return data[0];
}

/**
 * Busca o histórico recente de movimentações com os dados do aluno e turma relacionados.
 * @param {number} limite - Quantidade máxima de registros a retornar (padrão 20)
 */
export async function obterHistoricoRecente(limite = 20) {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      id,
      tipo,
      observacao,
      data_hora,
      alunos (
        id,
        nome,
        matricula,
        turmas (
          nome
        )
      )
    `)
    .order('data_hora', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('Erro ao buscar histórico:', error.message);
    throw error;
  }

  return data;
}

// ==========================================
// SERVIÇOS DE ALUNOS
// ==========================================

/**
 * Busca um aluno específico pela matrícula ou RA.
 * @param {string} matricula
 */
export async function buscarAlunoPorMatricula(matricula) {
  const { data, error } = await supabase
    .from('alunos')
    .select(`
      *,
      turmas (
        nome
      )
    `)
    .eq('matricula', matricula)
    .single();

  if (error) {
    console.error('Aluno não encontrado ou erro na busca:', error.message);
    throw error;
  }

  return data;
}

/**
 * Lista todos os alunos cadastrados.
 */
export async function listarAlunos() {
  const { data, error } = await supabase
    .from('alunos')
    .select(`
      *,
      turmas (
        nome
      )
    `)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao listar alunos:', error.message);
    throw error;
  }

  return data;
}

// ==========================================
// SERVIÇOS DE AUTORIZAÇÕES
// ==========================================

/**
 * Verifica se o aluno possui alguma autorização especial para saída em um determinado horário.
 * @param {string} aluno_id
 */
export async function verificarAutorizacaoSaida(aluno_id) {
  const hoje = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

  const { data, error } = await supabase
    .from('autorizacoes')
    .select('*')
    .eq('aluno_id', aluno_id)
    .gte('data_validade', hoje)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao verificar autorizações:', error.message);
    throw error;
  }

  return data;
}
