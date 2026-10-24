import { supabase } from './supabaseClient';

// Exemplo: Registar Entrada / Saída de Aluno
export async function registrarMovimentacao({ aluno_id, tipo, observacao }) {
  const { data, error } = await supabase
    .from('movimentacoes')
    .insert([
      { 
        aluno_id, 
        tipo, // 'ENTRADA' ou 'SAIDA'
        observacao, 
        data_hora: new Date().toISOString() 
      }
    ])
    .select();

  if (error) throw error;
  return data;
}

// Exemplo: Consultar Aluno por Matrícula / Cartão
export async function buscarAlunoPorMatricula(matricula) {
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('matricula', matricula)
    .single();

  if (error) throw error;
  return data;
}

// Exemplo: Obter Histórico Recente de Entradas/Saídas
export async function obterHistoricoRecente() {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*, alunos(nome, turmas(nome))')
    .order('data_hora', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}