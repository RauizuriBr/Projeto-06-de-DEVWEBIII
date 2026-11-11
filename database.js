// Banco SQLite local; usa sqlite3 (mesma biblioteca do material de aula).
// Em Node.js 22.13+, também funciona sem instalar pacotes, usando node:sqlite.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'agenda.sqlite');

const schema = `
  CREATE TABLE IF NOT EXISTS contatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    data_nascimento TEXT NOT NULL,
    cep TEXT NOT NULL,
    logradouro TEXT NOT NULL DEFAULT '',
    numero TEXT NOT NULL,
    complemento TEXT NOT NULL DEFAULT '',
    bairro TEXT NOT NULL DEFAULT '',
    cidade TEXT NOT NULL,
    uf TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

let driver;
let allImpl, getImpl, runImpl, readyImpl;
try {
  const { default: sqlite3 } = await import('sqlite3');
  const db = new sqlite3.Database(dbPath);
  db.configure('busyTimeout', 5000);
  exportDriverSqlite3(db);
  driver = 'sqlite3 (biblioteca da aula)';
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND' && error.code !== 'MODULE_NOT_FOUND') throw error;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(dbPath);
    db.exec(schema);
    exportDriverNative(db);
    driver = 'node:sqlite (interno do Node.js)';
  } catch {
    throw new Error('Não foi possível abrir o SQLite. Execute "npm install" (Node.js 18+) ou use Node.js 22.13+ para rodar sem dependências.');
  }
}

function exportDriverSqlite3(db) {
  readyImpl = new Promise((resolve, reject) => {
    db.run(schema, error => error ? reject(error) : resolve());
  });
  allImpl = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
  getImpl = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
  runImpl = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ id: Number(this.lastID), changes: this.changes });
    });
  });
}
function exportDriverNative(db) {
  readyImpl = Promise.resolve();
  allImpl = async (sql, params = []) => db.prepare(sql).all(...params);
  getImpl = async (sql, params = []) => db.prepare(sql).get(...params);
  runImpl = async (sql, params = []) => {
    const result = db.prepare(sql).run(...params);
    return { id: Number(result.lastInsertRowid), changes: Number(result.changes) };
  };
}

export const ready = readyImpl;
export const all = (...args) => allImpl(...args);
export const get = (...args) => getImpl(...args);
export const run = (...args) => runImpl(...args);
console.log('Banco de dados:', driver);
