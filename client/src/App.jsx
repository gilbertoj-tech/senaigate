import React, { useEffect, useState, useCallback } from 'react';
import { api, DEMO, formatHora, formatData, getTurno } from './api.js';

const hoje = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function App() {
  const [dataFiltro, setDataFiltro] = useState(hoje());
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, total: 0 });
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Formulário de Registro
  const [matricula, setMatricula] = useState('');
  const [alunoEncontrado, setAlunoEncontrado] = useState(null);
  const [tipoMovimentacao, setTipoMovimentacao] = useState('ENTRADA');
  const [observacao, setObservacao] = useState('');
  const [buscandoAluno, setBuscandoAluno] = useState(false);

  // Carregar dados principais
  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const [resumoData, movsData] = await Promise.all([
        api.getSummary(dataFiltro),
        api.getMovimentacoes(dataFiltro)
      ]);
      setResumo(resumoData || { entradas: 0, saidas: 0, total: 0 });
      setMovimentacoes(movsData || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setErro('Falha ao carregar as movimentações do dia.');
    } finally {
      setLoading(false);
    }
  }, [dataFiltro]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Buscar Aluno por Matrícula
  const handleBuscarAluno = async (e) => {
    e.preventDefault();
    if (!matricula.trim()) return;

    setBuscandoAluno(true);
    setAlunoEncontrado(null);
    setErro('');

    try {
      const aluno = await api.getAlunoPorMatricula(matricula.trim());
      if (aluno) {
        setAlunoEncontrado(aluno);
      } else {
        setErro('Aluno não encontrado com a matrícula informada.');
      }
    } catch (err) {
      console.error('Erro ao buscar aluno:', err);
      setErro('Erro ao consultar a matrícula do aluno.');
    } finally {
      setBuscandoAluno(false);
    }
  };

  // Registrar Entrada ou Saída
  const handleRegistrar = async (e) => {
    e.preventDefault();
    if (!alunoEncontrado) return;

    try {
      await api.registrarMovimentacao({
        aluno_id: alunoEncontrado.id,
        tipo: tipoMovimentacao,
        observacao: observacao.trim()
      });

      // Limpar formulário e recarregar lista
      setMatricula('');
      setAlunoEncontrado(null);
      setObservacao('');
      carregarDados();
    } catch (err) {
      console.error('Erro ao registrar movimentação:', err);
      setErro('Não foi possível registrar a movimentação.');
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Senaigate - Controle de Acesso</h1>
        <p>Senai Araraquara {DEMO && <span className="badge-demo">(Modo Demonstração)</span>}</p>
      </header>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <div className="dashboard-grid">
        {/* Painel de Resumo */}
        <div className="card summary-card">
          <h2>Resumo do Dia</h2>
          <div className="filter-group">
            <label htmlFor="data-filtro">Data:</label>
            <input
              type="date"
              id="data-filtro"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
            />
          </div>
          <div className="stats-container">
            <div className="stat-box entradas">
              <h3>Entradas</h3>
              <p>{resumo.entradas}</p>
            </div>
            <div className="stat-box saidas">
              <h3>Saídas</h3>
              <p>{resumo.saidas}</p>
            </div>
            <div className="stat-box total">
              <h3>Total</h3>
              <p>{resumo.total}</p>
            </div>
          </div>
        </div>

        {/* Formulário de Registro de Acesso */}
        <div className="card form-card">
          <h2>Registrar Acesso</h2>
          <form onSubmit={handleBuscarAluno} className="search-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Digite a Matrícula / RA do Aluno"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
              <button type="submit" disabled={buscandoAluno}>
                {buscandoAluno ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {alunoEncontrado && (
            <form onSubmit={handleRegistrar} className="register-form">
              <div className="aluno-info">
                <p><strong>Nome:</strong> {alunoEncontrado.nome}</p>
                <p><strong>Turma:</strong> {alunoEncontrado.turma || alunoEncontrado.turmas?.nome || 'N/A'}</p>
              </div>

              <div className="form-group">
                <label>Tipo de Movimentação:</label>
                <select
                  value={tipoMovimentacao}
                  onChange={(e) => setTipoMovimentacao(e.target.value)}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>

              <div className="form-group">
                <label>Observação:</label>
                <input
                  type="text"
                  placeholder="Ex: Saída antecipada autorizada"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary">Confirmar Registro</button>
            </form>
          )}
        </div>
      </div>

      {/* Tabela de Movimentações Recentes */}
      <div className="card table-card">
        <h2>Histórico de Movimentações ({formatData(dataFiltro)})</h2>
        {loading ? (
          <p>Carregando movimentações...</p>
        ) : movimentacoes.length === 0 ? (
          <p>Nenhuma movimentação registrada para esta data.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Turno</th>
                <th>Aluno</th>
                <th>Matrícula</th>
                <th>Tipo</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((item) => (
                <tr key={item.id}>
                  <td>{formatHora(item.created_at || item.data_hora)}</td>
                  <td>{getTurno(item.created_at || item.data_hora)}</td>
                  <td>{item.alunos?.nome || 'Aluno Desconhecido'}</td>
                  <td>{item.alunos?.matricula || '-'}</td>
                  <td>
                    <span className={`badge ${item.tipo === 'ENTRADA' ? 'badge-entrada' : 'badge-saida'}`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td>{item.observacao || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
