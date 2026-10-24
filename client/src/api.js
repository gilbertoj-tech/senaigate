export const DEMO = import.meta.env.VITE_DEMO === 'true';

async function real(url, body) {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.erro || 'Falha na requisição.'), { trocar: !!j.trocarSenha });
  return j;
}

// ---- Modo demonstração: mesma lógica do servidor, em memória ----
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const PERM = { docente: ['Docente'], encarregado: ['Coordenacao', 'OPP', 'QV', 'Secretaria'], responsavel: ['Coordenacao', 'OPP', 'QV', 'Secretaria'] };
const mk = (id, nome, nif, senha, funcao, extra = {}) => ({ id, nome, nif, senha, funcao, admin: false, status: 'aprovado', trocar_senha: false, ...extra });
const U = [
  mk(1, 'Administrador', 'sn1077068', 'abcd1234', 'Administrador', { admin: true }),
  mk(2, 'Prof. Marcos', '1001', 'prof123', 'Docente'),
  mk(3, 'Profa. Lúcia', '1002', 'prof123', 'Docente', { trocar_senha: true }),
  mk(4, 'Paulo (Coordenação)', '2001', 'coord123', 'Coordenacao'),
  mk(5, 'Ana (OPP)', '3001', 'opp123', 'OPP'),
  mk(6, 'Rita (Secretaria)', '4001', 'sec123', 'Secretaria'),
  mk(7, 'Joana (QV)', '5001', 'qv1234', 'QV', { status: 'pendente' }),
];
const sg = (id) => ({ nome: U[id - 1].nome, funcao: U[id - 1].funcao });
const base = { circ_de: null, circ_para: null, circ_ida: null, circ_retorno: null, tipo: null, horario: null, motivo: null, registrar: null, data: hoje() };
const A = [
  { ...base, id: 3, aluno: 'Diego Lima', turma: '1MEC-C', menor_idade: false, circ_de: 'Sala 12', circ_para: 'Biblioteca', circ_ida: '09:10', circ_retorno: '09:40', assinaturas: {} },
  { ...base, id: 2, aluno: 'Carla Souza', turma: '2ELE-B', menor_idade: false, tipo: 'Entrada', horario: '07:50', motivo: 'Atraso no transporte', registrar: 'Presenca', assinaturas: { docente: sg(2), encarregado: sg(5) } },
  { ...base, id: 1, aluno: 'Bruno Almeida', turma: '3AUT-A', menor_idade: true, tipo: 'Saida', horario: '15:40', motivo: 'Consulta médica', registrar: 'Presenca', assinaturas: { docente: sg(2), encarregado: sg(4) } },
];
A.unshift(
  { ...base, id: 4, aluno: 'Eduarda Reis', turma: '2ELE-A', menor_idade: false, tipo: 'Saida', horario: '11:20', motivo: 'Mal-estar', registrar: 'Falta', assinaturas: { docente: sg(3) } },
  { ...base, id: 5, aluno: 'Fábio Nunes', turma: '1MEC-B', menor_idade: false, tipo: 'Entrada', horario: '08:15', motivo: 'Consulta odontológica', registrar: 'Presenca', assinaturas: { docente: sg(2), encarregado: sg(6) } },
);
let aid = 10, uid = 10;
const erro = (m, trocar = false) => Object.assign(new Error(m), { trocar });
const auth = (nif, senha) => { const u = U.find((x) => x.nif === nif && x.senha === senha); if (!u) throw erro('NIF ou senha incorretos.'); return u; };
const validaNova = (n, s) => { if (!n || n.length < 6 || n === s) throw erro('A nova senha precisa ter 6 ou mais caracteres e ser diferente da atual.', true); };

function mock(url, b) {
  const [path, qs] = url.split('?'); const p = new URLSearchParams(qs || '');
  if (!b && path === '/api/autorizacoes') {
    const q = (p.get('q') || '').toLowerCase();
    return A.filter((a) => (!p.get('data') || a.data === p.get('data')) && (!q || (a.aluno + a.turma).toLowerCase().includes(q))).sort((x, y) => y.id - x.id);
  }
  if (path === '/api/autorizacoes') {
    if (!b.aluno?.trim() || !b.turma?.trim()) throw erro('Informe o nome do aluno e a turma.');
    if (!b.tipo && !b.circ_de) throw erro('Preencha a circulação ou marque entrada/saída.');
    A.push({ ...base, ...b, data: b.data || hoje(), id: ++aid, assinaturas: {} }); return { id: aid };
  }
  let m = path.match(/^\/api\/autorizacoes\/(\d+)\/assinar$/);
  if (m) {
    const u = auth(b.nif, b.senha), a = A.find((x) => x.id === +m[1]);
    if (u.status !== 'aprovado') throw erro('Seu cadastro ainda não foi liberado pelo administrador.');
    if (!u.admin && !PERM[b.papel].includes(u.funcao)) throw erro(`Sua função (${u.funcao}) não pode assinar este item.`);
    if (u.trocar_senha) { if (!b.novaSenha) throw erro('Defina uma nova senha para continuar.', true); validaNova(b.novaSenha, b.senha); }
    if (a.assinaturas[b.papel]) throw erro('Este item já foi autorizado.');
    a.assinaturas[b.papel] = { nome: u.nome, funcao: u.funcao };
    if (u.trocar_senha) { u.senha = b.novaSenha; u.trocar_senha = false; }
    return { ok: true };
  }
  if (path === '/api/cadastro') {
    if (!b.nome?.trim() || !b.nif?.trim() || !b.senha || b.senha.length < 6) throw erro('Preencha nome, NIF e uma senha com pelo menos 6 caracteres.');
    if (U.some((x) => x.nif === b.nif.trim())) throw erro('Este NIF já está cadastrado.');
    U.push(mk(++uid, b.nome.trim(), b.nif.trim(), b.senha, b.funcao, { status: 'pendente' })); return { ok: true };
  }
  if (path === '/api/senha') { const u = auth(b.nif, b.senha); validaNova(b.novaSenha, b.senha); u.senha = b.novaSenha; u.trocar_senha = false; return { ok: true }; }
  if (path.startsWith('/api/admin/')) {
    const ad = U.find((x) => x.nif === b.nif && x.senha === b.senha && x.admin);
    if (!ad) throw erro('Acesso restrito ao administrador.');
    if (path.endsWith('/usuarios')) return U.map(({ senha, ...r }) => r).sort((x, y) => (y.status === 'pendente') - (x.status === 'pendente'));
    const t = U.find((x) => x.id === b.usuarioId);
    if (b.acao === 'aprovar') t.status = 'aprovado';
    if (b.acao === 'rejeitar' && !t.admin) t.status = 'rejeitado';
    if (b.acao === 'promover') { t.admin = true; t.status = 'aprovado'; }
    if (b.acao === 'rebaixar' && U.filter((x) => x.admin).length > 1) t.admin = false;
    if (b.acao === 'exigir_troca') t.trocar_senha = true;
    return { ok: true };
  }
  throw erro('Rota desconhecida.');
}
export const api = DEMO ? (url, body) => new Promise((ok, no) => setTimeout(() => { try { ok(structuredClone(mock(url, body))); } catch (e) { no(e); } }, 120)) : real;
