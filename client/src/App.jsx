import { useEffect, useState, useCallback } from 'react';
import { api, DEMO } from './api.js';

const hoje = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const FUNCOES = [['Docente', 'Docente'], ['Coordenacao', 'Coordenação'], ['OPP', 'OPP'], ['QV', 'QV'], ['Secretaria', 'Secretaria']];
const PAPEIS = { docente: 'Docente', encarregado: 'Encarregado', responsavel: 'Responsável legal' };


function Modal({ titulo, onClose, children }) {
  return (
    <div className="veu" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={titulo}>
        <header><h2>{titulo}</h2><button className="x" onClick={onClose} aria-label="Fechar">×</button></header>
        {children}
      </div>
    </div>
  );
}

const exige = (a) => a.menor_idade && a.tipo === 'Saida';
const faltam = (a) => [['docente', 'Docente'], ['encarregado', 'Encarregado'], ['responsavel', 'Responsável legal']].filter(([p]) => (p !== 'responsavel' || exige(a)) && !a.assinaturas[p]);
const liberado = (a) => faltam(a).length === 0;
const tipoRot = (a) => (a.tipo === 'Saida' ? 'Saída' : a.tipo === 'Entrada' ? 'Entrada' : 'Circulação');
const iniciais = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const tituloData = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'todas as datas');
const somaDia = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const dm = (d) => d.split('-').reverse().join('/');

const ICONES = {
  lista: 'M7 3h8l4 4v14H7z M15 3v4h4 M10 12h6 M10 16h6',
  novo: 'M9 11a4 4 0 100-8 4 4 0 000 8z M2 21v-1a6 6 0 0112 0v1 M19 8v6 M16 11h6',
  chave: 'M8 19a4 4 0 100-8 4 4 0 000 8z M11 12l9-9 M16 7l3 3',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  busca: 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-5-5',
  mais: 'M12 5v14 M5 12h14',
  entrada: 'M10 17l5-5-5-5 M15 12H3 M14 4h6v16h-6',
  saida: 'M14 17l5-5-5-5 M19 12H7 M10 4H4v16h6',
  troca: 'M4 8h15 M15 4l4 4-4 4 M20 16H5 M9 12l-4 4 4 4',
  pessoa: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0',
  relogio: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2',
  ok: 'M5 13l4 4L19 7',
  agenda: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  alerta: 'M12 9v4 M12 17h.01 M10.3 4l-8 14a2 2 0 001.7 3h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z',
  lista2: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
};
function Icon({ n, s = 20 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONES[n]} /></svg>;
}
function Ring({ pct }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <span className="ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r={r} className="ring-bg" /><circle cx="20" cy="20" r={r} className="ring-fg" strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 20 20)" /></svg><b>{pct}%</b></span>
  );
}
function Lamp({ a, p, rot, obrig, abrir }) {
  const s = a.assinaturas[p];
  return (
    <div className={'c-lamp ' + (!obrig ? 'na' : s ? 'on' : 'off')}>
      <b className="ml">{rot}</b>
      <button className="lampbtn" disabled={!obrig || !!s} onClick={abrir} aria-label={`${rot}: ${!obrig ? 'não se aplica' : s ? 'autorizado' : 'não autorizado'}`}
        title={s ? `${s.nome} (${s.funcao})` : obrig ? 'Clique para autorizar' : ''}><span className="lamp" /></button>
      <small>{!obrig ? 'Não se aplica' : s ? 'Autorizado' : 'Não autorizado'}</small>
    </div>
  );
}

function Credenciais({ onSubmit, rotulo, erro, trocar, aviso }) {
  const [nif, setNif] = useState(''); const [senha, setSenha] = useState('');
  const [nova, setNova] = useState(''); const [conf, setConf] = useState(''); const [local, setLocal] = useState('');
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (trocar && nova !== conf) return setLocal('As duas senhas novas não são iguais.');
      setLocal(''); onSubmit(nif.trim(), senha, trocar ? nova : undefined);
    }}>
      <label>NIF<input value={nif} onChange={(e) => setNif(e.target.value)} autoFocus required readOnly={!!aviso} /></label>
      <label>{trocar ? 'Senha atual' : 'Senha'}<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required readOnly={!!aviso} /></label>
      {trocar && <>
        {aviso && <p className="aviso">{aviso}</p>}
        <label>Nova senha (mínimo 6 caracteres)<input type="password" value={nova} onChange={(e) => setNova(e.target.value)} required minLength={6} autoFocus={!!aviso} /></label>
        <label>Repita a nova senha<input type="password" value={conf} onChange={(e) => setConf(e.target.value)} required /></label>
      </>}
      {(local || erro) && <p className="erro">{local || erro}</p>}
      <button className="primario">{rotulo}</button>
    </form>
  );
}

function Assinar({ a, papel, onClose, onDone }) {
  const [erro, setErro] = useState(''); const [trocar, setTrocar] = useState(false);
  return (
    <Modal titulo={`Autorizar como ${PAPEIS[papel].toLowerCase()}`} onClose={onClose}>
      <p className="sub">{a.aluno} · {a.turma}</p>
      <Credenciais rotulo={trocar ? 'Salvar senha e autorizar' : 'Autorizar'} erro={erro} trocar={trocar}
        aviso={trocar ? 'O administrador pediu que você defina uma nova senha. Depois de salvar, a autorização continua normalmente.' : ''}
        onSubmit={async (nif, senha, novaSenha) => {
          try { await api(`/api/autorizacoes/${a.id}/assinar`, { nif, senha, papel, novaSenha }); onDone(); }
          catch (e) { setTrocar(!!e.trocar); setErro(e.trocar && !novaSenha ? '' : e.message); }
        }} />
    </Modal>
  );
}

function AlterarSenha({ onClose }) {
  const [erro, setErro] = useState(''); const [ok, setOk] = useState(false);
  if (ok) return <Modal titulo="Senha alterada" onClose={onClose}><p>Use a nova senha na próxima autorização.</p><button className="primario" onClick={onClose}>Fechar</button></Modal>;
  return (
    <Modal titulo="Alterar senha" onClose={onClose}>
      <Credenciais trocar rotulo="Salvar nova senha" erro={erro}
        onSubmit={async (nif, senha, novaSenha) => { try { await api('/api/senha', { nif, senha, novaSenha }); setOk(true); } catch (e) { setErro(e.message); } }} />
    </Modal>
  );
}

function Nova({ onClose, onDone }) {
  const [f, setF] = useState({ aluno: '', turma: '', data: hoje(), menor_idade: false, comCirc: false, comMov: true, tipo: 'Entrada', registrar: 'Presenca' });
  const [erro, setErro] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const enviar = async (e) => {
    e.preventDefault();
    const b = { ...f, tipo: f.comMov ? f.tipo : null, registrar: f.comMov ? f.registrar : null };
    if (!f.comCirc) { b.circ_de = b.circ_para = b.circ_ida = b.circ_retorno = ''; }
    try { await api('/api/autorizacoes', b); onDone(); } catch (x) { setErro(x.message); }
  };
  return (
    <Modal titulo="Nova autorização" onClose={onClose}>
      <form onSubmit={enviar}>
        <div className="duo">
          <label>Nome do aluno(a)<input value={f.aluno} onChange={set('aluno')} required autoFocus /></label>
          <label>Turma<input value={f.turma} onChange={set('turma')} required /></label>
        </div>
        <div className="duo">
          <label>Data<input type="date" value={f.data} onChange={set('data')} required /></label>
          <label className="chk"><input type="checkbox" checked={f.menor_idade} onChange={set('menor_idade')} />Aluno(a) menor de idade</label>
        </div>
        <fieldset><legend><label className="chk"><input type="checkbox" checked={f.comCirc} onChange={set('comCirc')} />Autorização de circulação</label></legend>
          {f.comCirc && <div className="quad">
            <label>De<input value={f.circ_de || ''} onChange={set('circ_de')} /></label>
            <label>Para<input value={f.circ_para || ''} onChange={set('circ_para')} /></label>
            <label>Horário ida<input type="time" value={f.circ_ida || ''} onChange={set('circ_ida')} /></label>
            <label>Horário retorno<input type="time" value={f.circ_retorno || ''} onChange={set('circ_retorno')} /></label>
          </div>}
        </fieldset>
        <fieldset><legend><label className="chk"><input type="checkbox" checked={f.comMov} onChange={set('comMov')} />Autorização de entrada ou saída</label></legend>
          {f.comMov && <>
            <div className="duo">
              <label>Tipo<select value={f.tipo} onChange={set('tipo')}><option value="Entrada">Entrada</option><option value="Saida">Saída</option></select></label>
              <label>Horário<input type="time" value={f.horario || ''} onChange={set('horario')} /></label>
            </div>
            <label>Motivo<input value={f.motivo || ''} onChange={set('motivo')} /></label>
            <label>No diário, registrar<select value={f.registrar} onChange={set('registrar')}><option value="Presenca">Presença</option><option value="Falta">Falta</option></select></label>
          </>}
        </fieldset>
        {erro && <p className="erro">{erro}</p>}
        <button className="primario">Criar autorização</button>
      </form>
    </Modal>
  );
}

function Cadastro({ onClose }) {
  const [f, setF] = useState({ nome: '', nif: '', senha: '', funcao: 'Docente' });
  const [erro, setErro] = useState(''); const [ok, setOk] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (ok) return <Modal titulo="Cadastro enviado" onClose={onClose}><p>Seu cadastro aguarda a liberação do administrador. Depois disso você poderá autorizar com seu NIF e senha.</p><button className="primario" onClick={onClose}>Fechar</button></Modal>;
  return (
    <Modal titulo="Cadastrar-me" onClose={onClose}>
      <form onSubmit={async (e) => { e.preventDefault(); try { await api('/api/cadastro', f); setOk(true); } catch (x) { setErro(x.message); } }}>
        <label>Nome<input value={f.nome} onChange={set('nome')} required autoFocus /></label>
        <div className="duo">
          <label>NIF<input value={f.nif} onChange={set('nif')} required /></label>
          <label>Função<select value={f.funcao} onChange={set('funcao')}>{FUNCOES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        </div>
        <label>Senha (mínimo 6 caracteres)<input type="password" value={f.senha} onChange={set('senha')} required minLength={6} /></label>
        {erro && <p className="erro">{erro}</p>}
        <button className="primario">Enviar cadastro</button>
      </form>
    </Modal>
  );
}

function Admin({ onClose }) {
  const [cred, setCred] = useState(null); const [lista, setLista] = useState([]); const [erro, setErro] = useState('');
  const carregar = async (c) => { try { setLista(await api('/api/admin/usuarios', c)); setCred(c); setErro(''); } catch (e) { setErro(e.message); } };
  const agir = async (usuarioId, acao) => { await api('/api/admin/decidir', { ...cred, usuarioId, acao }); carregar(cred); };
  if (!cred) return <Modal titulo="Administração" onClose={onClose}><Credenciais rotulo="Entrar" erro={erro} onSubmit={(nif, senha) => carregar({ nif, senha })} /></Modal>;
  const pend = lista.filter((u) => u.status === 'pendente');
  return (
    <Modal titulo="Administração" onClose={onClose}>
      <h3>Cadastros a liberar ({pend.length})</h3>
      {!pend.length && <p className="sub">Nenhum cadastro pendente.</p>}
      {pend.map((u) => <div className="linha-u" key={u.id}><span>{u.nome} <small>NIF {u.nif} · {u.funcao}</small></span>
        <span><button className="primario" onClick={() => agir(u.id, 'aprovar')}>Aceitar</button> <button onClick={() => agir(u.id, 'rejeitar')}>Recusar</button></span></div>)}
      <h3>Usuários</h3>
      {lista.filter((u) => u.status === 'aprovado').map((u) => <div className="linha-u" key={u.id}><span>{u.nome} <small>NIF {u.nif} · {u.admin ? 'Administrador' : u.funcao}</small></span>
        <span className="acoes">
          {u.trocar_senha ? <small>Troca de senha pendente</small> : <button onClick={() => agir(u.id, 'exigir_troca')}>Exigir troca de senha</button>}
          {u.admin ? <button onClick={() => agir(u.id, 'rebaixar')}>Remover administrador</button> : <button onClick={() => agir(u.id, 'promover')}>Tornar administrador</button>}
        </span></div>)}
    </Modal>
  );
}

const RAPIDOS = [
  ['Entrada', 'Entradas', 'entrada', (a) => a.tipo === 'Entrada'],
  ['Saida', 'Saídas', 'saida', (a) => a.tipo === 'Saida'],
  ['Circ', 'Circulação', 'troca', (a) => !!a.circ_de],
  ['Menor', 'Menores', 'pessoa', (a) => a.menor_idade],
  ['Falta', 'Diário: falta', 'alerta', (a) => a.registrar === 'Falta'],
  ['Presenca', 'Diário: presença', 'ok', (a) => a.registrar === 'Presenca'],
];
const REGRAS = [
  'Até 5 minutos de atraso: o aluno entra na aula sem autorização.',
  'Depois dos 5 minutos: autorização do Docente e de um Encarregado (OPP, QV, Coordenação ou Secretaria).',
  'Saída antecipada: Docente e Encarregado. Para menor de idade, também o Responsável legal, contatado por OPP, QV, Coordenação ou Secretaria.',
  'A portaria só libera a saída quando todas as lâmpadas exigidas estão acesas.',
];

export default function App() {
  const [data, setData] = useState(hoje()); const [q, setQ] = useState('');
  const [status, setStatus] = useState('todos'); const [rapido, setRapido] = useState(null); const [aba, setAba] = useState('pendentes');
  const [lista, setLista] = useState([]); const [modal, setModal] = useState(null); const [toast, setToast] = useState('');
  const carregar = useCallback(() => {
    const p = new URLSearchParams(); if (data) p.set('data', data); if (q) p.set('q', q);
    api('/api/autorizacoes?' + p).then(setLista).catch(() => {});
  }, [data, q]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 15000); return () => clearInterval(t); }, [carregar]);
  const fechar = () => setModal(null);
  const feito = (msg) => { fechar(); carregar(); if (msg) { setToast(msg); setTimeout(() => setToast(''), 4000); } };

  const total = lista.length; const libs = lista.filter(liberado).length; const ag = total - libs;
  const pct = (n) => (total ? Math.round((n * 100) / total) : 0);
  const fr = RAPIDOS.find((r) => r[0] === rapido)?.[3];
  const visiveis = lista.filter((a) => (status === 'todos' || (status === 'liberados' ? liberado(a) : !liberado(a))) && (!fr || fr(a)));
  const lateral = aba === 'liberados' ? lista.filter(liberado) : lista.filter((a) => !liberado(a));
  const abrirPrimeira = (a) => { const f = faltam(a)[0]; if (f) setModal({ t: 'assinar', a, p: f[0] }); };
  const periodos = [[hoje(), 'Hoje', 'agenda'], [somaDia(hoje(), -1), 'Ontem', 'relogio'], ['', 'Todas as datas', 'lista2']];
  const CARTOES = [['todos', 'Todos os pedidos', `${libs} de ${total} liberados`, 'lista', pct(libs)], ['aguardando', 'Aguardando', `${ag} sem autorização completa`, 'relogio', pct(ag)], ['liberados', 'Liberados', 'prontos para a portaria', 'ok', pct(libs)]];

  return (
    <>
      {DEMO && <details className="demo"><summary>Modo demonstração: os dados ficam só na memória deste navegador. Veja os acessos de teste.</summary>
        <p>Administrador: <b>sn1077068</b> (sua senha). Docente: <b>1001</b> / prof123. Docente com troca de senha exigida: <b>1002</b> / prof123. Coordenação: <b>2001</b> / coord123. OPP: <b>3001</b> / opp123. Secretaria: <b>4001</b> / sec123. Há também um cadastro pendente (QV) para o administrador liberar.</p></details>}
      <div className="app">
        <nav className="rail" aria-label="Menu principal">
          <span className="logo" aria-hidden="true"><i className="a" /><i className="a" /><i /></span>
          <button className="on" aria-label="Pedidos" title="Pedidos"><Icon n="lista" /></button>
          <button aria-label="Cadastrar-me" title="Cadastrar-me" onClick={() => setModal({ t: 'cad' })}><Icon n="novo" /></button>
          <button aria-label="Alterar senha" title="Alterar senha" onClick={() => setModal({ t: 'senha' })}><Icon n="chave" /></button>
          <button aria-label="Administração" title="Administração" onClick={() => setModal({ t: 'admin' })}><Icon n="escudo" /></button>
        </nav>

        <aside className="side">
          <h1>SenaiGate</h1>
          <p className="slogan">Circulação, entrada e saída de alunos</p>
          <ul className="periodos">
            {periodos.map(([d, nome, ic]) => (
              <li key={nome}><button className={data === d ? 'sel' : ''} onClick={() => setData(d)}>
                <span className="pico"><Icon n={ic} s={18} /></span><span><b>{nome}</b><small>{d ? dm(d) : 'Histórico completo'}</small></span></button></li>
            ))}
          </ul>
          <div className="links">
            <button onClick={() => setModal({ t: 'cad' })}><Icon n="novo" s={16} />Cadastrar-me</button>
            <button onClick={() => setModal({ t: 'senha' })}><Icon n="chave" s={16} />Alterar senha</button>
            <button onClick={() => setModal({ t: 'admin' })}><Icon n="escudo" s={16} />Administração</button>
          </div>
          <div className="promo"><b>Regra dos 5 minutos</b><p>Até 5 minutos de atraso o aluno entra sem autorização. Depois disso, precisa de Docente e Encarregado.</p>
            <button onClick={() => setAba('regras')}>Ver todas as regras</button></div>
          <button className="criar" onClick={() => setModal({ t: 'nova' })}><Icon n="mais" s={18} />Nova autorização</button>
        </aside>

        <main className="main">
          <div className="topo">
            <label className="busca"><Icon n="busca" s={18} /><input type="search" placeholder="Buscar aluno ou turma" aria-label="Buscar aluno ou turma" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <div className="datas">
              <button aria-label="Dia anterior" onClick={() => setData(somaDia(data || hoje(), -1))}>‹</button>
              <input type="date" aria-label="Data" value={data} onChange={(e) => setData(e.target.value)} />
              <button aria-label="Próximo dia" onClick={() => setData(somaDia(data || hoje(), 1))}>›</button>
            </div>
            <button className="criar nova-top" onClick={() => setModal({ t: 'nova' })}><Icon n="mais" s={18} />Nova</button>
          </div>

          <section className="cartoes" aria-label="Resumo">
            {CARTOES.map(([v, nome, sub, ic, p]) => (
              <button key={v} className={'cartao' + (status === v ? ' sel' : '')} onClick={() => setStatus(v)}>
                <span className="ci"><Icon n={ic} s={18} /></span>
                <span className="ct"><b>{nome}</b><small>{sub}</small></span>
                <Ring pct={p} />
              </button>
            ))}
          </section>

          <h2>Acesso rápido</h2>
          <div className="rapidos">
            {RAPIDOS.map(([k, nome, ic]) => (
              <button key={k} className={'rapido' + (rapido === k ? ' sel' : '')} onClick={() => setRapido(rapido === k ? null : k)} aria-pressed={rapido === k}>
                <span className={'tile t-' + k}><Icon n={ic} s={22} /></span><small>{nome}</small></button>
            ))}
            <button className="rapido" onClick={() => setModal({ t: 'nova' })}><span className="tile mais"><Icon n="mais" s={22} /></span><small>Nova</small></button>
          </div>

          <div className="cab"><h2>Pedidos de {tituloData(data)}</h2><button className="ver" onClick={() => { setData(''); setStatus('todos'); setRapido(null); }}>Ver todas</button></div>
          <div className="tabela">
            <div className="thead"><span>Aluno</span><span>Turma</span><span>Pedido</span><span>Docente</span><span>Encarregado</span><span>Responsável</span></div>
            {!visiveis.length && <div className="vazio"><p>Nenhuma autorização {data ? 'nesta data' : 'encontrada'}{status !== 'todos' || rapido ? ' com estes filtros' : ''}.</p>
              <button className="criar" onClick={() => setModal({ t: 'nova' })}><Icon n="mais" s={18} />Criar autorização</button></div>}
            {visiveis.map((a) => {
              const ok = liberado(a); const cls = a.tipo === 'Saida' ? 'Saida' : a.tipo === 'Entrada' ? 'Entrada' : 'Circ';
              return (
                <div className={'linha' + (ok ? ' lib' : '')} key={a.id}>
                  <div className="c-aluno"><span className={'ico t-' + cls}><Icon n={cls === 'Saida' ? 'saida' : cls === 'Entrada' ? 'entrada' : 'troca'} s={18} /></span>
                    <span><b>{a.aluno}</b><small>{a.motivo || 'Sem motivo informado'}</small></span></div>
                  <div className="c-turma"><span>{a.turma}</span></div>
                  <div className="c-pedido">
                    {a.tipo && <span>{tipoRot(a)}{a.horario && ` às ${a.horario}`}</span>}
                    {a.circ_de && <span>Circulação: {a.circ_de} para {a.circ_para || '—'}{a.circ_ida && `, ${a.circ_ida} a ${a.circ_retorno || '—'}`}</span>}
                    <span className="chips">
                      {a.menor_idade && <i className="chip alerta">Menor de idade</i>}
                      {a.registrar && <i className="chip">Diário: {a.registrar === 'Falta' ? 'falta' : 'presença'}</i>}
                      {!data && <i className="chip">{dm(a.data)}</i>}
                      {ok && <i className="chip verde">Liberado na portaria</i>}
                    </span>
                  </div>
                  <Lamp a={a} p="docente" rot="Docente" obrig abrir={() => setModal({ t: 'assinar', a, p: 'docente' })} />
                  <Lamp a={a} p="encarregado" rot="Encarregado" obrig abrir={() => setModal({ t: 'assinar', a, p: 'encarregado' })} />
                  <Lamp a={a} p="responsavel" rot="Responsável legal" obrig={exige(a)} abrir={() => setModal({ t: 'assinar', a, p: 'responsavel' })} />
                </div>
              );
            })}
          </div>
        </main>

        <aside className="pane">
          <h2>Portaria</h2>
          <div className="abas" role="tablist">
            {[['pendentes', 'Pendentes'], ['liberados', 'Liberados'], ['regras', 'Regras']].map(([v, t]) =>
              <button key={v} role="tab" aria-selected={aba === v} className={aba === v ? 'sel' : ''} onClick={() => setAba(v)}>{t}</button>)}
          </div>
          {aba === 'regras' ? (
            <ul className="tl">{REGRAS.map((r) => <li key={r} className="tli"><span className="corpo"><small className="regra">{r}</small></span></li>)}</ul>
          ) : (
            <ul className="tl">
              {!lateral.length && <li className="tli"><span className="corpo"><small>{aba === 'liberados' ? 'Nenhuma saída ou entrada liberada ainda.' : 'Tudo em dia. Nenhum pedido aguardando.'}</small></span></li>}
              {lateral.map((a) => (
                <li key={a.id}><button className="tli" onClick={() => aba === 'pendentes' && abrirPrimeira(a)} disabled={aba !== 'pendentes'}>
                  <span className="hora">{a.horario || a.circ_ida || 'Sem horário'}{!data && ` · ${dm(a.data)}`}</span>
                  <span className="corpo"><span className="avatar">{iniciais(a.aluno)}</span>
                    <span><b>{a.aluno}</b><small>{aba === 'pendentes' ? 'Falta: ' + faltam(a).map((f) => f[1]).join(', ') : tipoRot(a) + ' liberada'}</small></span></span>
                </button></li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      {toast && <div className="toast" role="status"><span className="tok"><Icon n="ok" s={16} /></span><div><b>{toast}</b><small>A lista foi atualizada.</small></div><button className="x" onClick={() => setToast('')} aria-label="Fechar">×</button></div>}
      {modal?.t === 'nova' && <Nova onClose={fechar} onDone={() => feito('Pedido criado')} />}
      {modal?.t === 'cad' && <Cadastro onClose={fechar} />}
      {modal?.t === 'senha' && <AlterarSenha onClose={fechar} />}
      {modal?.t === 'admin' && <Admin onClose={fechar} />}
      {modal?.t === 'assinar' && <Assinar a={modal.a} papel={modal.p} onClose={fechar} onDone={() => feito('Autorização registrada')} />}
    </>
  );
}
