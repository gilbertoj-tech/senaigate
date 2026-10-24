import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
const app = express();
app.use(cors());
app.use(express.json());

const FUNCOES = ['Docente', 'Coordenacao', 'OPP', 'QV', 'Secretaria'];
// Quem pode assinar cada papel (Administrador pode todos)
const PERMITIDOS = {
  docente: ['Docente'],
  encarregado: ['Coordenacao', 'OPP', 'QV', 'Secretaria'],
  responsavel: ['Coordenacao', 'OPP', 'QV', 'Secretaria'], // so Docente nao contata responsaveis
};
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

async function autenticar(nif, senha) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE nif=$1', [nif]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(senha || '', u.senha_hash))) return null;
  return u;
}

// ---- Autorizacoes ----
app.get('/api/autorizacoes', wrap(async (req, res) => {
  const { data, q } = req.query;
  const { rows } = await pool.query(
    `SELECT a.*, to_char(a.data,'YYYY-MM-DD') AS data,
       to_char(a.horario,'HH24:MI') AS horario, to_char(a.circ_ida,'HH24:MI') AS circ_ida,
       to_char(a.circ_retorno,'HH24:MI') AS circ_retorno,
       COALESCE((SELECT json_object_agg(s.papel, json_build_object('nome',u.nome,'funcao',u.funcao,'em',s.assinado_em))
                 FROM assinaturas s JOIN usuarios u ON u.id=s.usuario_id WHERE s.autorizacao_id=a.id), '{}') AS assinaturas
     FROM autorizacoes a
     WHERE ($1::date IS NULL OR a.data=$1::date)
       AND ($2::text IS NULL OR a.aluno ILIKE '%'||$2||'%' OR a.turma ILIKE '%'||$2||'%')
     ORDER BY a.criado_em DESC`,
    [data || null, q || null]);
  res.json(rows);
}));

app.post('/api/autorizacoes', wrap(async (req, res) => {
  const b = req.body;
  if (!b.aluno?.trim() || !b.turma?.trim()) return res.status(400).json({ erro: 'Informe o nome do aluno e a turma.' });
  if (!b.tipo && !b.circ_de) return res.status(400).json({ erro: 'Preencha a circulação ou marque entrada/saída.' });
  const n = (v) => (v === '' || v === undefined ? null : v);
  const { rows } = await pool.query(
    `INSERT INTO autorizacoes (aluno,turma,data,menor_idade,circ_de,circ_para,circ_ida,circ_retorno,tipo,horario,motivo,registrar)
     VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [b.aluno.trim(), b.turma.trim(), n(b.data), !!b.menor_idade, n(b.circ_de), n(b.circ_para), n(b.circ_ida),
     n(b.circ_retorno), n(b.tipo), n(b.horario), n(b.motivo), n(b.registrar)]);
  res.status(201).json(rows[0]);
}));

app.post('/api/autorizacoes/:id/assinar', wrap(async (req, res) => {
  const { nif, senha, papel, novaSenha } = req.body;
  if (!PERMITIDOS[papel]) return res.status(400).json({ erro: 'Papel inválido.' });
  const u = await autenticar(nif, senha);
  if (!u) return res.status(401).json({ erro: 'NIF ou senha incorretos.' });
  if (u.status !== 'aprovado') return res.status(403).json({ erro: 'Seu cadastro ainda não foi liberado pelo administrador.' });
  if (!u.admin && !PERMITIDOS[papel].includes(u.funcao))
    return res.status(403).json({ erro: `Sua função (${u.funcao}) não pode assinar este item.` });
  if (u.trocar_senha) {
    if (!novaSenha) return res.status(428).json({ erro: 'Defina uma nova senha para continuar.', trocarSenha: true });
    if (novaSenha.length < 6 || novaSenha === senha)
      return res.status(400).json({ erro: 'A nova senha precisa ter 6 ou mais caracteres e ser diferente da atual.', trocarSenha: true });
  }
  try {
    await pool.query('INSERT INTO assinaturas (autorizacao_id,papel,usuario_id) VALUES ($1,$2,$3)', [req.params.id, papel, u.id]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Este item já foi autorizado.' });
    throw e;
  }
  if (u.trocar_senha)
    await pool.query('UPDATE usuarios SET senha_hash=$1, trocar_senha=FALSE WHERE id=$2', [await bcrypt.hash(novaSenha, 10), u.id]);
  res.json({ ok: true });
}));

// ---- Cadastro e administracao ----
app.post('/api/cadastro', wrap(async (req, res) => {
  const { nome, nif, senha, funcao } = req.body;
  if (!nome?.trim() || !nif?.trim() || !senha || senha.length < 6) return res.status(400).json({ erro: 'Preencha nome, NIF e uma senha com pelo menos 6 caracteres.' });
  if (!FUNCOES.includes(funcao)) return res.status(400).json({ erro: 'Escolha uma função válida.' });
  try {
    await pool.query('INSERT INTO usuarios (nome,nif,senha_hash,funcao) VALUES ($1,$2,$3,$4)',
      [nome.trim(), nif.trim(), await bcrypt.hash(senha, 10), funcao]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Este NIF já está cadastrado.' });
    throw e;
  }
  res.status(201).json({ ok: true });
}));

app.post('/api/senha', wrap(async (req, res) => {
  const { nif, senha, novaSenha } = req.body;
  const u = await autenticar(nif, senha);
  if (!u) return res.status(401).json({ erro: 'NIF ou senha atual incorretos.' });
  if (!novaSenha || novaSenha.length < 6 || novaSenha === senha)
    return res.status(400).json({ erro: 'A nova senha precisa ter 6 ou mais caracteres e ser diferente da atual.' });
  await pool.query('UPDATE usuarios SET senha_hash=$1, trocar_senha=FALSE WHERE id=$2', [await bcrypt.hash(novaSenha, 10), u.id]);
  res.json({ ok: true });
}));

async function exigirAdmin(req, res) {
  const u = await autenticar(req.body.nif, req.body.senha);
  if (!u || !u.admin || u.status !== 'aprovado') { res.status(403).json({ erro: 'Acesso restrito ao administrador.' }); return null; }
  return u;
}
app.post('/api/admin/usuarios', wrap(async (req, res) => {
  if (!(await exigirAdmin(req, res))) return;
  const { rows } = await pool.query("SELECT id,nome,nif,funcao,admin,status,trocar_senha FROM usuarios ORDER BY (status='pendente') DESC, nome");
  res.json(rows);
}));
app.post('/api/admin/decidir', wrap(async (req, res) => {
  if (!(await exigirAdmin(req, res))) return;
  const { usuarioId, acao } = req.body; // aprovar | rejeitar | promover | rebaixar | exigir_troca
  const sql = {
    aprovar: "UPDATE usuarios SET status='aprovado' WHERE id=$1",
    rejeitar: "UPDATE usuarios SET status='rejeitado' WHERE id=$1 AND NOT admin",
    promover: "UPDATE usuarios SET admin=TRUE, status='aprovado' WHERE id=$1",
    exigir_troca: "UPDATE usuarios SET trocar_senha=TRUE WHERE id=$1",
    rebaixar: "UPDATE usuarios SET admin=FALSE WHERE id=$1 AND (SELECT COUNT(*) FROM usuarios WHERE admin)>1",
  }[acao];
  if (!sql) return res.status(400).json({ erro: 'Ação inválida.' });
  await pool.query(sql, [usuarioId]);
  res.json({ ok: true });
}));

// ---- Inicializacao ----
async function iniciar() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const { ADMIN_NIF, ADMIN_NOME, ADMIN_SENHA } = process.env;
  const { rows } = await pool.query('SELECT 1 FROM usuarios WHERE admin LIMIT 1');
  if (!rows.length && ADMIN_NIF && ADMIN_SENHA) {
    await pool.query("INSERT INTO usuarios (nome,nif,senha_hash,funcao,admin,status) VALUES ($1,$2,$3,'Administrador',TRUE,'aprovado')",
      [ADMIN_NOME || 'Administrador', ADMIN_NIF, await bcrypt.hash(ADMIN_SENHA, 10)]);
    console.log('Administrador inicial criado.');
  }
  const dist = path.join(__dirname, '../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  const porta = process.env.PORT || 3001;
  const { SSL_KEY_FILE, SSL_CERT_FILE } = process.env;
  if (SSL_KEY_FILE && SSL_CERT_FILE) {
    https.createServer({ key: fs.readFileSync(SSL_KEY_FILE), cert: fs.readFileSync(SSL_CERT_FILE) }, app)
      .listen(porta, '0.0.0.0', () => console.log('Servidor HTTPS na porta ' + porta));
  } else {
    app.listen(porta, '0.0.0.0', () => console.log('Servidor HTTP na porta ' + porta + ' (use HTTPS via proxy ou SSL_*_FILE)'));
  }
}
iniciar().catch((e) => { console.error(e); process.exit(1); });
