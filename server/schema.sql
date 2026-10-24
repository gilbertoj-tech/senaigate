CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  nif TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  funcao TEXT NOT NULL CHECK (funcao IN ('Docente','Coordenacao','OPP','QV','Secretaria','Administrador')),
  admin BOOLEAN NOT NULL DEFAULT FALSE,
  trocar_senha BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS autorizacoes (
  id SERIAL PRIMARY KEY,
  aluno TEXT NOT NULL,
  turma TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  menor_idade BOOLEAN NOT NULL DEFAULT FALSE,
  circ_de TEXT, circ_para TEXT, circ_ida TIME, circ_retorno TIME,
  tipo TEXT CHECK (tipo IN ('Entrada','Saida')),
  horario TIME,
  motivo TEXT,
  registrar TEXT CHECK (registrar IN ('Falta','Presenca')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assinaturas (
  autorizacao_id INT NOT NULL REFERENCES autorizacoes(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('docente','encarregado','responsavel')),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (autorizacao_id, papel)
);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_data ON autorizacoes(data);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;
-- Supabase: bloqueia a API publica (anon). Apenas o servidor Node acessa o banco.
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE autorizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;

-- Administrador inicial (a senha esta gravada apenas como hash). Troca de senha exigida no primeiro uso.
INSERT INTO usuarios (nome,nif,senha_hash,funcao,admin,status,trocar_senha)
VALUES ('Administrador','sn1077068','$2a$10$P0Zvn11FiPIUHWuY51ekVugne60OyZIvJgXvQs4gSOjWd396q4S/C','Administrador',TRUE,'aprovado',TRUE)
ON CONFLICT (nif) DO NOTHING;
