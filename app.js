// Projeto baseado no 261007_Projeto_Recurso da aula.
// Servidor HTTP nativo do Node.js, sem Express. CRUD armazenado em SQLite.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ready, all, get, run } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 5000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function respondJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

async function getRequestBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) {
      const err = new Error('O corpo da requisição é muito grande.');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body === null || Array.isArray(body) || typeof body !== 'object') {
      throw new Error();
    }
    return body;
  } catch {
    const err = new Error('Envie um JSON válido.');
    err.status = 400;
    throw err;
  }
}

function validateContact(input) {
  const names = ['nome', 'email', 'telefone', 'data_nascimento', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'];
  const data = {};
  for (const key of names) {
    data[key] = typeof input[key] === 'string' ? input[key].trim() : '';
  }
  const limits = {nome:120,email:160,telefone:20,data_nascimento:10,cep:9,logradouro:160,numero:20,complemento:100,bairro:100,cidade:100,uf:2};
  for (const [key,max] of Object.entries(limits)) {
    if (data[key].length > max) return { error: `O campo ${key} ultrapassou o tamanho permitido.` };
  }
  if (data.nome.length < 2) return { error: 'Informe um nome com pelo menos 2 caracteres.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: 'Informe um e-mail válido.' };
  if (!/^\d{10,11}$/.test(data.telefone.replace(/\D/g, ''))) return { error: 'Telefone deve conter DDD e 10 ou 11 dígitos.' };
  if (!/^\d{8}$/.test(data.cep.replace(/\D/g, ''))) return { error: 'CEP deve conter 8 dígitos.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data_nascimento)) return { error: 'Informe uma data de nascimento válida.' };
  const date = new Date(`${data.data_nascimento}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== data.data_nascimento || date > new Date()) {
    return { error: 'A data de nascimento é inválida ou está no futuro.' };
  }
  if (!data.numero) return { error: 'Informe o número do endereço (ou S/N).' };
  if (!data.cidade) return { error: 'Informe a cidade.' };
  if (!/^[a-z]{2}$/i.test(data.uf)) return { error: 'UF deve conter 2 letras.' };
  data.uf = data.uf.toUpperCase();
  data.cep = data.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2');
  return { data };
}

const columns = ['nome','email','telefone','data_nascimento','cep','logradouro','numero','complemento','bairro','cidade','uf'];

async function handleAPI(req, res, url) {
  const { pathname } = url;
  const { method } = req;
  if (pathname === '/api/contatos' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const where = q ? `WHERE nome LIKE ? OR email LIKE ? OR telefone LIKE ? OR CAST(id AS TEXT) = ?` : '';
    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`, q] : [];
    const contatos = await all(`SELECT * FROM contatos ${where} ORDER BY nome COLLATE NOCASE, id DESC`, params);
    return respondJSON(res, 200, contatos);
  }
  if (pathname === '/api/estatisticas' && method === 'GET') {
    const stats = await get('SELECT COUNT(*) AS total FROM contatos');
    const recentes = await all('SELECT id, nome, email, telefone FROM contatos ORDER BY id DESC LIMIT 5');
    return respondJSON(res, 200, { total: stats.total, recentes });
  }
  if (pathname === '/api/contatos' && method === 'POST') {
    const { data, error } = validateContact(await getRequestBody(req));
    if (error) return respondJSON(res, 400, { erro: error });
    const params = columns.map(col => data[col]);
    const placeholders = columns.map(() => '?').join(', ');
    const result = await run(`INSERT INTO contatos (${columns.join(', ')}) VALUES (${placeholders})`, params);
    return respondJSON(res, 201, { mensagem: 'Contato cadastrado com sucesso!', contato: await get('SELECT * FROM contatos WHERE id = ?', [result.id]) });
  }
  const match = pathname.match(/^\/api\/contatos\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    if (!Number.isSafeInteger(id) || id < 1) return respondJSON(res, 400, { erro: 'ID inválido.' });
    if (method === 'GET') {
      const contato = await get('SELECT * FROM contatos WHERE id = ?', [id]);
      return contato ? respondJSON(res, 200, contato) : respondJSON(res, 404, { erro: 'Contato não encontrado.' });
    }
    if (method === 'PUT') {
      const { data, error } = validateContact(await getRequestBody(req));
      if (error) return respondJSON(res, 400, { erro: error });
      const set = columns.map(col => `${col} = ?`).join(', ');
      const result = await run(`UPDATE contatos SET ${set} WHERE id = ?`, [...columns.map(col => data[col]), id]);
      return result.changes ? respondJSON(res, 200, { mensagem: 'Contato atualizado!', contato: await get('SELECT * FROM contatos WHERE id = ?', [id]) }) : respondJSON(res, 404, { erro: 'Contato não encontrado.' });
    }
    if (method === 'DELETE') {
      const result = await run('DELETE FROM contatos WHERE id = ?', [id]);
      return result.changes ? respondJSON(res, 200, { mensagem: 'Contato excluído.' }) : respondJSON(res, 404, { erro: 'Contato não encontrado.' });
    }
  }
  return respondJSON(res, 404, { erro: 'Rota de API não encontrada.' });
}

async function serveStaticFile(req, res, pathname) {
  if (!['GET','HEAD'].includes(req.method)) return respondJSON(res, 405, { erro: 'Método não permitido.' });
  let filePath;
  try {
    filePath = path.resolve(publicDir, '.' + (pathname === '/' ? '/index.html' : pathname));
  } catch {
    return respondJSON(res, 400, { erro: 'Caminho inválido.' });
  }
  if (!filePath.startsWith(publicDir + path.sep)) return respondJSON(res, 403, { erro: 'Acesso proibido.' });
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    return respondJSON(res, 404, { erro: 'Página não encontrada.' });
  }
}

async function callback(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    await ready;
    if (pathname.startsWith('/api/')) return await handleAPI(req, res, url);
    return await serveStaticFile(req, res, pathname);
  } catch (err) {
    if (err.status) return respondJSON(res, err.status, { erro: err.message });
    console.error('Erro:', err);
    return respondJSON(res, 500, { erro: 'Erro interno do servidor.' });
  }
}

await ready;
http.createServer(callback).listen(PORT, () => {
  console.log(`\nAgenda de Contatos pronta: http://localhost:${PORT}/`);
  console.log('Banco local: agenda.sqlite');
});
