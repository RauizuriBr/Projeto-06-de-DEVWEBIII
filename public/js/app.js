'use strict';

const $ = (selector, root = document) => root.querySelector(selector);

function showMessage(element, message, type = 'info') {
  if (!element) return;
  element.textContent = message;
  element.className = `mensagem ${type}`;
  element.hidden = false;
}

async function requestAPI(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira se ele está iniciado.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.erro || `Erro HTTP ${response.status}`);
  return result;
}

function onlyDigits(value) { return String(value).replace(/\D/g, ''); }
function formatCEP(value) {
  const digits = onlyDigits(value).slice(0,8);
  return digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
}
function formatPhone(value) {
  const digits = onlyDigits(value).slice(0,11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  const index = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0,2)}) ${digits.slice(2,index)}-${digits.slice(index)}`;
}
function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '-';
  const [year,month,day] = value.split('-');
  return `${day}/${month}/${year}`;
}

// Busca pública de CEP no navegador. Caso o CEP seja genérico, os campos
// podem ser completados/alterados manualmente.
function setupCep(form) {
  const cepInput = $('[name="cep"]', form);
  const btn = $('[data-buscar-cep]', form);
  const status = $('[data-cep-status]', form);
  const fieldNames = ['logradouro','bairro','cidade','uf'];
  let previousRequest = '';
  let busy = false;
  async function buscarCEP() {
    const cep = onlyDigits(cepInput.value);
    if (cep.length !== 8) {
      status.textContent = 'Digite um CEP com 8 números.';
      return;
    }
    if (busy) return;
    busy = true;
    previousRequest = cep;
    btn.disabled = true;
    status.textContent = 'Consultando CEP no ViaCEP…';
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!resp.ok) throw new Error('Não foi possível consultar o CEP.');
      const result = await resp.json();
      if (result.erro) throw new Error('CEP não encontrado. Verifique os números digitados.');
      if (onlyDigits(cepInput.value) !== previousRequest) return;
      const mapping = {logradouro:result.logradouro, bairro:result.bairro, cidade:result.localidade, uf:result.uf};
      for (const name of fieldNames) {
        const input = $(`[name="${name}"]`, form);
        input.value = mapping[name] || '';
      }
      status.textContent = 'Endereço localizado! Confira e complete o número.';
      const numero = $('[name="numero"]', form);
      if (!numero.value) numero.focus();
    } catch (err) {
      status.textContent = `${err.message} Você também pode preencher o endereço manualmente.`;
    } finally {
      busy = false;
      btn.disabled = false;
    }
  }
  cepInput.addEventListener('input', e => {
    e.target.value = formatCEP(e.target.value);
    status.textContent = '';
  });
  cepInput.addEventListener('blur', () => {
    if (onlyDigits(cepInput.value).length === 8) buscarCEP();
  });
  btn.addEventListener('click', buscarCEP);
}

function setupPhone(form) {
  const el = $('[name="telefone"]', form);
  el.addEventListener('input', () => { el.value = formatPhone(el.value); });
}
function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}
function populateForm(form, contact) {
  for (const element of Array.from(form.elements)) {
    if (element.name && Object.hasOwn(contact, element.name)) {
      element.value = contact[element.name] ?? '';
    }
  }
}
function createElement(tag, text, cssClass) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = String(text);
  if (cssClass) el.className = cssClass;
  return el;
}
function renderRow(contato, small = false) {
  const tr = document.createElement('tr');
  const values = small
    ? [contato.nome, contato.email, formatPhone(contato.telefone)]
    : [contato.id, contato.nome, contato.email, formatPhone(contato.telefone), `${contato.cidade}/${contato.uf}`, formatDate(contato.data_nascimento)];
  for (const value of values) tr.appendChild(createElement('td', value));
  const td = createElement('td');
  const actions = createElement('div', undefined, 'actions-inline');
  const edit = createElement('a', 'Editar', 'btn btn-light btn-small');
  edit.href = `/atualizar.html?id=${contato.id}`;
  const del = createElement('a', 'Excluir', 'btn btn-ghost btn-small');
  del.href = `/excluir.html?id=${contato.id}`;
  actions.append(edit, del);
  td.appendChild(actions);
  tr.appendChild(td);
  return tr;
}

async function initHome() {
  const count = $('#totalContatos');
  const table = $('#recentes');
  try {
    const {total,recentes} = await requestAPI('/api/estatisticas');
    count.textContent = total;
    table.replaceChildren();
    if (!recentes.length) {
      const tr = document.createElement('tr');
      const td = createElement('td', 'Nenhum contato cadastrado ainda. Cadastre o primeiro!', 'empty');
      td.colSpan = 4; tr.appendChild(td); table.appendChild(tr);
    } else {
      recentes.forEach(c => table.appendChild(renderRow(c,true)));
    }
  } catch(err) {
    count.textContent = '—';
    showMessage($('#homeMensagem'), err.message, 'erro');
  }
}

function initCadastrar() {
  const form = $('#formCadastro');
  const msg = $('#formMensagem');
  setupCep(form); setupPhone(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submit = $('[type="submit"]', form);
    submit.disabled = true;
    try {
      const result = await requestAPI('/api/contatos', {
        method: 'POST', body: JSON.stringify(formData(form))
      });
      showMessage(msg, `${result.mensagem} ID gerado: ${result.contato.id}.`, 'ok');
      form.reset();
    } catch(err) {
      showMessage(msg, err.message, 'erro');
    } finally { submit.disabled = false; }
  });
}

function initConsultar() {
  const table = $('#tabelaContatos');
  const field = $('#busca');
  const msg = $('#consultaMensagem');
  async function load(q = '') {
    try {
      const result = await requestAPI(`/api/contatos?q=${encodeURIComponent(q)}`);
      table.replaceChildren();
      if (result.length === 0) {
        const tr = document.createElement('tr');
        const td = createElement('td', 'Nenhum contato encontrado.', 'empty');
        td.colSpan = 7;
        tr.appendChild(td); table.appendChild(tr);
      } else {
        result.forEach(contact => table.appendChild(renderRow(contact)));
      }
      $('#quantidadeResultado').textContent = `${result.length} contato(s)`;
      msg.hidden = true;
    } catch (err) { showMessage(msg, err.message, 'erro'); }
  }
  $('#formBusca').addEventListener('submit', e => {e.preventDefault(); load(field.value.trim());});
  $('#listarTodos').addEventListener('click', () => { field.value = ''; load(); });
  load();
}

function idFromURL() {
  const value = new URLSearchParams(location.search).get('id');
  return value && /^\d+$/.test(value) ? value : '';
}

function initAtualizar() {
  const form = $('#formAtualizacao');
  const message = $('#atualizacaoMensagem');
  const section = $('#painelAtualizacao');
  const search = $('#idBusca');
  let loadedId = null;
  setupCep(form); setupPhone(form);
  async function find(id) {
    if (!/^\d+$/.test(String(id)) || Number(id) < 1) return showMessage($('#buscaMensagem'), 'Informe um ID válido.', 'erro');
    try {
      const contact = await requestAPI(`/api/contatos/${id}`);
      loadedId = contact.id;
      populateForm(form, contact);
      section.hidden = false;
      $('#editID').textContent = `ID #${contact.id}`;
      $('#buscaMensagem').hidden = true;
      message.hidden = true;
    } catch(err) {
      section.hidden = true;
      loadedId = null;
      showMessage($('#buscaMensagem'), err.message, 'erro');
    }
  }
  $('#formBuscaID').addEventListener('submit', e => {e.preventDefault(); find(search.value.trim());});
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!loadedId) return;
    const submit = $('[type="submit"]', form);
    submit.disabled = true;
    try {
      const result = await requestAPI(`/api/contatos/${loadedId}`, {method:'PUT',body:JSON.stringify(formData(form))});
      showMessage(message, result.mensagem, 'ok');
    } catch(err) { showMessage(message,err.message,'erro'); }
    finally { submit.disabled = false; }
  });
  const queryId = idFromURL();
  if (queryId) { search.value = queryId; find(queryId); }
}

function initExcluir() {
  const search = $('#idBusca');
  const section = $('#painelExclusao');
  const msg = $('#exclusaoMensagem');
  let loaded = null;
  async function find(id) {
    if (!/^\d+$/.test(String(id)) || Number(id) < 1) return showMessage($('#buscaMensagem'), 'Informe um ID válido.', 'erro');
    try {
      loaded = await requestAPI(`/api/contatos/${id}`);
      const entries = {
        resultadoId: loaded.id,
        resultadoNome: loaded.nome,
        resultadoEmail: loaded.email,
        resultadoTelefone: formatPhone(loaded.telefone),
        resultadoNascimento: formatDate(loaded.data_nascimento),
        resultadoEndereco: `${loaded.logradouro || 'Endereço'} ${loaded.numero}, ${loaded.bairro} — ${loaded.cidade}/${loaded.uf} — CEP ${loaded.cep}`
      };
      for (const [el, val] of Object.entries(entries)) $(`#${el}`).textContent = val;
      section.hidden = false;
      msg.hidden = true;
      $('#buscaMensagem').hidden = true;
    } catch(err) {
      section.hidden = true; loaded = null;
      showMessage($('#buscaMensagem'),err.message,'erro');
    }
  }
  $('#formBuscaID').addEventListener('submit', e => {e.preventDefault(); find(search.value.trim());});
  $('#btnExcluir').addEventListener('click', async () => {
    if (!loaded || !window.confirm(`Excluir definitivamente o contato "${loaded.nome}"?`)) return;
    try {
      const result = await requestAPI(`/api/contatos/${loaded.id}`, {method:'DELETE'});
      section.hidden = true; loaded = null; search.value = '';
      showMessage($('#buscaMensagem'),result.mensagem,'ok');
    } catch(err) {showMessage(msg,err.message,'erro');}
  });
  const queryId = idFromURL();
  if (queryId) {search.value=queryId;find(queryId);}
}

const pageHandlers = {
  home: initHome,
  cadastrar: initCadastrar,
  consultar: initConsultar,
  atualizar: initAtualizar,
  excluir: initExcluir
};
pageHandlers[document.body.dataset.page]?.();
