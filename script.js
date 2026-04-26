import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query, orderBy, getDocs, limit, startAfter,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyBqoGraJXoKHXQZKD_M1N9AtoZNYkDs390",
  authDomain: "controle-financeiro-27322.firebaseapp.com",
  projectId: "controle-financeiro-27322",
  storageBucket: "controle-financeiro-27322.firebasestorage.app",
  messagingSenderId: "7208831581",
  appId: "1:7208831581:web:cd8d4aaf81ca5fd6ad1bb4"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const MESES_POR_PAGINA = 12;

const estado = {
  usuarioAtual:         null,
  mesAtualId:           null,
  mesAtualNome:         null,
  transacoes:           [],
  mesesCarregados:      [],
  ultimoDocMes:         null,
  totalMesesCarregados: 0,
  unsubTransacoes:      null,
  unsubMeses:           null,
  unsubListenersMeses:  {},
  transacaoAbatendo:    null,
  transacaoEditando:    null,
  mesesDisponiveis:     [],
  filtroAtivo:          'todos',
  metaMes:              null,
  transacaoEditando:    null,
  transacaoAbatendo:    null,
  logsPagina:           [],
  logsUnsubscribe:      null,
};

const el = {
  telaAuth:        document.getElementById('tela-auth'),
  telaMeses:       document.getElementById('tela-meses'),
  telaLancamentos: document.getElementById('tela-lancamentos'),
  formLogin:       document.getElementById('form-login'),
  formCadastro:    document.getElementById('form-cadastro'),
  loginEmail:      document.getElementById('login-email'),
  loginSenha:      document.getElementById('login-senha'),
  erroLogin:       document.getElementById('erro-login'),
  cadastroNome:    document.getElementById('cadastro-nome'),
  cadastroEmail:   document.getElementById('cadastro-email'),
  cadastroSenha:   document.getElementById('cadastro-senha'),
  erroCadastro:    document.getElementById('erro-cadastro'),
  usuarioNome:     document.getElementById('usuario-nome'),
  usuarioNome2:    document.getElementById('usuario-nome-2'),
  formNovoMes:     document.getElementById('form-novo-mes'),
  nomeMes:         document.getElementById('nome-mes'),
  gridMeses:       document.getElementById('grid-meses'),
  btnVerMais:      document.getElementById('btn-ver-mais'),
  tituloMesAtual:  document.getElementById('titulo-mes-atual'),
  formTransacao:   document.getElementById('formulario-transacao'),
  descricao:       document.getElementById('descricao'),
  valor:           document.getElementById('valor'),
  lista:           document.getElementById('lista-transacoes'),
  saldoTotal:      document.getElementById('saldo-total'),
  totalEntradas:   document.getElementById('total-entradas'),
  totalSaidas:     document.getElementById('total-saidas'),
  cardSaldo:       document.getElementById('card-saldo'),
  modalAbatimento: document.getElementById('modal-abatimento'),
  modalInfo:       document.getElementById('modal-info-transacao'),
  valorAbatimento: document.getElementById('valor-abatimento'),
  descAbatimento:  document.getElementById('descricao-abatimento'),
  erroAbatimento:  document.getElementById('erro-abatimento'),
  modalHistorico:  document.getElementById('modal-historico'),
  modalMultiMes:   document.getElementById('modal-multi-mes'),
  listaMultiMes:   document.getElementById('lista-multi-mes'),
  erroMultiMes:    document.getElementById('erro-multi-mes'),
  descMultiMes:    document.getElementById('desc-multi-mes'),
  valorMultiMes:   document.getElementById('valor-multi-mes'),
  modalEdicao:     document.getElementById('modal-edicao'),
  editDescricao:   document.getElementById('edit-descricao'),
  editValor:       document.getElementById('edit-valor'),
  erroEdicao:         document.getElementById('erro-edicao'),
  modalHistoricoAtiv: document.getElementById('modal-historico-atividades'),
  listaLogs:          document.getElementById('lista-logs'),
};

function fmt(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function traduzirErro(codigo) {
  const erros = {
    'auth/invalid-email':        'E-mail inválido.',
    'auth/user-not-found':       'Usuário não encontrado.',
    'auth/wrong-password':       'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password':        'Senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests':    'Muitas tentativas. Aguarde.',
    'auth/invalid-credential':   'E-mail ou senha incorretos.',
  };
  return erros[codigo] || 'Erro inesperado. Tente novamente.';
}

function setCarregando(btnId, carregando, textoOriginal) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = carregando;
  btn.classList.toggle('botao-primario--carregando', carregando);
  btn.textContent = carregando ? 'Aguarde...' : textoOriginal;
}

function mostrarTela(id) {
  ['tela-auth', 'tela-meses', 'tela-lancamentos'].forEach(t => {
    document.getElementById(t).classList.toggle('tela--escondida', t !== id);
  });
}

window.trocarAba = function(aba) {
  document.getElementById('aba-login').classList.toggle('auth-aba--ativa', aba === 'login');
  document.getElementById('aba-cadastro').classList.toggle('auth-aba--ativa', aba === 'cadastro');
  document.getElementById('form-login').classList.toggle('auth-form--escondido', aba !== 'login');
  document.getElementById('form-cadastro').classList.toggle('auth-form--escondido', aba !== 'cadastro');
  el.erroLogin.textContent    = '';
  el.erroCadastro.textContent = '';
};

el.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.erroLogin.textContent = '';
  setCarregando('btn-login', true, 'Entrar');
  try {
    await signInWithEmailAndPassword(auth, el.loginEmail.value.trim(), el.loginSenha.value);
  } catch (err) {
    el.erroLogin.textContent = traduzirErro(err.code);
    setCarregando('btn-login', false, 'Entrar');
  }
});

el.formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.erroCadastro.textContent = '';
  const nome  = el.cadastroNome.value.trim();
  const email = el.cadastroEmail.value.trim();
  const senha = el.cadastroSenha.value;
  if (!nome) { el.erroCadastro.textContent = 'Informe seu nome.'; return; }
  setCarregando('btn-cadastro', true, 'Criar conta');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
  } catch (err) {
    el.erroCadastro.textContent = traduzirErro(err.code);
    setCarregando('btn-cadastro', false, 'Criar conta');
  }
});

window.sair = async function() {
  cancelarTodosListeners();
  await signOut(auth);
};

function cancelarTodosListeners() {
  if (estado.unsubTransacoes) { estado.unsubTransacoes(); estado.unsubTransacoes = null; }
  if (estado.unsubMeses)      { estado.unsubMeses();      estado.unsubMeses = null; }
  Object.values(estado.unsubListenersMeses).forEach(fn => fn());
  estado.unsubListenersMeses = {};
  estado.transacoes          = [];
  estado.mesesCarregados     = [];
  estado.ultimoDocMes        = null;
}

const colMeses       = (uid)                     => collection(db, 'usuarios', uid, 'meses');
const colTransacoes  = (uid, mesId)              => collection(db, 'usuarios', uid, 'meses', mesId, 'transacoes');
const colAbatimentos = (uid, mesId, transacaoId) => collection(db, 'usuarios', uid, 'meses', mesId, 'transacoes', transacaoId, 'abatimentos');
const colLogs        = (uid, mesId)              => collection(db, 'usuarios', uid, 'meses', mesId, 'logs');
const docMes         = (uid, mesId)              => doc(db, 'usuarios', uid, 'meses', mesId);

async function registrarLog(uid, mesId, acao, dados) {
  await addDoc(colLogs(uid, mesId), {
    acao,
    descricao: dados.descricao || '',
    valor:     dados.valor     || null,
    extra:     dados.extra     || null,
    criadoEm: new Date().toISOString(),
  });
}

async function migrarMesesSemTimestamp(uid, docs) {
  const semTimestamp = docs.filter(d => !d.data().ultimaEdicao);
  if (semTimestamp.length === 0) return;
  await Promise.all(
    semTimestamp.map(d =>
      updateDoc(doc(db, 'usuarios', uid, 'meses', d.id), { ultimaEdicao: serverTimestamp() })
    )
  );
}

function escutarMeses(uid) {
  if (estado.unsubMeses) estado.unsubMeses();
  estado.mesesCarregados      = [];
  estado.ultimoDocMes         = null;
  estado.totalMesesCarregados = 0;

  getDocs(colMeses(uid)).then(async (snapTodos) => {
    await migrarMesesSemTimestamp(uid, snapTodos.docs);
    const q = query(colMeses(uid), orderBy('ultimaEdicao', 'desc'), limit(MESES_POR_PAGINA));
    estado.unsubMeses = onSnapshot(q, (snapshot) => {
      estado.mesesCarregados  = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      estado.ultimoDocMes     = snapshot.docs[snapshot.docs.length - 1] || null;
      estado.mesesDisponiveis = [...estado.mesesCarregados];
      renderizarGridMeses();
      atualizarBotaoVerMais(snapshot.docs.length);
    });
  });
}

window.carregarMaisMeses = async function() {
  if (!estado.ultimoDocMes) return;
  const uid = estado.usuarioAtual.uid;
  setCarregando('btn-ver-mais', true, 'Ver mais');
  const q = query(colMeses(uid), orderBy('ultimaEdicao', 'desc'), limit(MESES_POR_PAGINA), startAfter(estado.ultimoDocMes));
  const snap = await getDocs(q);
  const novosMeses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  estado.mesesCarregados  = [...estado.mesesCarregados, ...novosMeses];
  estado.ultimoDocMes     = snap.docs[snap.docs.length - 1] || null;
  estado.mesesDisponiveis = [...estado.mesesCarregados];
  renderizarGridMeses();
  atualizarBotaoVerMais(snap.docs.length);
  setCarregando('btn-ver-mais', false, 'Ver mais');
};

function atualizarBotaoVerMais(qtdRetornada) {
  el.btnVerMais.style.display = qtdRetornada >= MESES_POR_PAGINA ? 'block' : 'none';
}

const cacheTotais = {};

function escutarTotaisMes(uid, mesId) {
  if (estado.unsubListenersMeses[mesId]) return;
  const q = query(colTransacoes(uid, mesId), orderBy('criadoEm', 'desc'));
  estado.unsubListenersMeses[mesId] = onSnapshot(q, (snap) => {
    let entradas = 0, saidas = 0;
    snap.forEach(d => {
      const t = d.data();
      const v = t.valorRestante !== undefined ? t.valorRestante : t.valor;
      if (t.tipo === 'entrada') entradas += v;
      else                      saidas   += v;
    });
    cacheTotais[mesId] = { entradas, saidas, saldo: entradas - saidas };
    atualizarCardMes(mesId);
  });
}

function atualizarCardMes(mesId) {
  renderizarGridMeses();
}

function statusMes(saldo, entradas) {
  if (entradas === 0 && saldo === 0) return 'neutro';
  if (saldo > 0)  return 'positivo';
  if (saldo === 0) return 'atencao';
  return 'critico';
}

function htmlCardMes(mes, totais) {
  const { entradas, saidas, saldo } = totais;
  const status = statusMes(saldo, entradas);
  const badges = {
    positivo: '<span class="card-mes__badge badge--positivo">● Positivo</span>',
    atencao:  '<span class="card-mes__badge badge--atencao">● Atenção</span>',
    critico:  '<span class="card-mes__badge badge--critico">● Crítico</span>',
    neutro:   '<span class="card-mes__badge badge--neutro">— Sem dados</span>',
  };
  return `
    <div class="card-mes card-mes--${status}" data-mes-id="${mes.id}"
         onclick="abrirMes('${mes.id}', '${mes.nome.replace(/'/g, "\\'")}')">
      <div class="card-mes__header">
        <span class="card-mes__nome">${mes.nome}</span>
        ${badges[status]}
      </div>
      <div class="card-mes__linha">
        <span>Entradas</span>
        <span style="color:var(--cor-entrada)">${fmt(entradas)}</span>
      </div>
      <div class="card-mes__linha">
        <span>Saídas</span>
        <span style="color:var(--cor-saida)">${fmt(saidas)}</span>
      </div>
      <div class="card-mes__saldo">${fmt(saldo)}</div>
      <button class="card-mes__remover" onclick="removerMes(event,'${mes.id}')" title="Remover mês">✕</button>
    </div>
  `;
}

function filtrarMeses(meses) {
  const f = estado.filtroAtivo;
  if (f === 'todos') return meses;
  return meses.filter(mes => {
    const t = cacheTotais[mes.id] || { entradas: 0, saidas: 0, saldo: 0 };
    if (f === 'positivo')    return t.saldo > 0;
    if (f === 'critico')     return t.saldo < 0;
    if (f === 'comEntrada')  return t.entradas > 0;
    if (f === 'maisSaida')   return t.saidas > t.entradas;
    return true;
  });
}

function renderizarGridMeses() {
  const uid = estado.usuarioAtual?.uid;
  if (!uid) return;

  estado.mesesCarregados.forEach(mes => escutarTotaisMes(uid, mes.id));

  const filtrados = filtrarMeses(estado.mesesCarregados);

  if (estado.mesesCarregados.length === 0) {
    el.gridMeses.innerHTML = '<p class="lista-transacoes__vazia">Nenhum mês criado ainda. Crie um acima. ✦</p>';
    return;
  }

  if (filtrados.length === 0) {
    el.gridMeses.innerHTML = '<p class="lista-transacoes__vazia">Nenhum mês encontrado com esse filtro. ✦</p>';
    return;
  }

  el.gridMeses.innerHTML = filtrados.map(mes => {
    const totais = cacheTotais[mes.id] || { entradas: 0, saidas: 0, saldo: 0 };
    return htmlCardMes(mes, totais);
  }).join('');
}

window.aplicarFiltro = function(filtro) {
  estado.filtroAtivo = filtro;
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.classList.toggle('filtro-btn--ativo', btn.dataset.filtro === filtro);
  });
  renderizarGridMeses();
};

el.formNovoMes.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = el.nomeMes.value.trim();
  if (!nome) return;
  const uid = estado.usuarioAtual.uid;
  await addDoc(colMeses(uid), { nome, criadoEm: new Date().toISOString(), ultimaEdicao: serverTimestamp() });
  el.nomeMes.value = '';
});

window.removerMes = async function(event, mesId) {
  event.stopPropagation();
  if (!confirm('Remover este mês e todas as transações?')) return;
  const uid = estado.usuarioAtual.uid;
  if (estado.unsubListenersMeses[mesId]) {
    estado.unsubListenersMeses[mesId]();
    delete estado.unsubListenersMeses[mesId];
  }
  delete cacheTotais[mesId];
  await deleteDoc(docMes(uid, mesId));
};

window.abrirMes = function(mesId, mesNome) {
  estado.mesAtualId   = mesId;
  estado.mesAtualNome = mesNome;
  el.tituloMesAtual.textContent = mesNome;
  mostrarTela('tela-lancamentos');
  escutarTransacoes();
};

window.voltarParaMeses = function() {
  if (estado.unsubTransacoes) { estado.unsubTransacoes(); estado.unsubTransacoes = null; }
  estado.mesAtualId = null;
  estado.transacoes = [];
  mostrarTela('tela-meses');
};

function escutarTransacoes() {
  if (estado.unsubTransacoes) estado.unsubTransacoes();
  const { uid } = estado.usuarioAtual;
  const mesId   = estado.mesAtualId;
  const q = query(colTransacoes(uid, mesId), orderBy('criadoEm', 'desc'));
  estado.unsubTransacoes = onSnapshot(q, (snap) => {
    estado.transacoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizarLancamentos();
  });
  carregarMetaMes(uid, mesId).then(renderizarIndicador);
}

async function salvarTransacaoNoMes(uid, mesId, dados) {
  await addDoc(colTransacoes(uid, mesId), { ...dados, criadoEm: new Date().toISOString() });
  await updateDoc(docMes(uid, mesId), { ultimaEdicao: serverTimestamp() });
  await registrarLog(uid, mesId, 'adicionou', { descricao: dados.descricao, valor: dados.valor });
}

el.formTransacao.addEventListener('submit', async (e) => {
  e.preventDefault();
  const descricao = el.descricao.value.trim();
  const valor     = parseFloat(el.valor.value);
  const tipo      = document.querySelector('input[name="tipo"]:checked')?.value;
  if (!descricao || !valor || valor <= 0 || !tipo) { alert('Preencha todos os campos corretamente.'); return; }
  const btn = document.getElementById('btn-adicionar');
  btn.disabled = true; btn.textContent = 'Salvando...';
  const { uid } = estado.usuarioAtual;
  await salvarTransacaoNoMes(uid, estado.mesAtualId, { descricao, valor, valorRestante: valor, tipo });
  el.formTransacao.reset();
  btn.disabled = false; btn.textContent = 'Adicionar Transação';
});

window.removerTransacao = async function(id) {
  if (!confirm('Remover esta transação?')) return;
  const { uid } = estado.usuarioAtual;
  const transacao = estado.transacoes.find(t => t.id === id);
  await deleteDoc(doc(db, 'usuarios', uid, 'meses', estado.mesAtualId, 'transacoes', id));
  await updateDoc(docMes(uid, estado.mesAtualId), { ultimaEdicao: serverTimestamp() });
  if (transacao) await registrarLog(uid, estado.mesAtualId, 'removeu', { descricao: transacao.descricao, valor: transacao.valor });
};

window.abrirModalEdicao = function(transacaoId) {
  const transacao = estado.transacoes.find(t => t.id === transacaoId);
  if (!transacao) return;
  estado.transacaoEditando      = transacao;
  el.erroEdicao.textContent     = '';
  el.editDescricao.value        = transacao.descricao;
  el.editValor.value            = transacao.valor;
  document.querySelectorAll('input[name="tipo-edit"]').forEach(r => { r.checked = r.value === transacao.tipo; });
  el.modalEdicao.classList.remove('modal-overlay--escondida');
  setTimeout(() => el.editDescricao.focus(), 50);
};

window.fecharModalEdicao = function() {
  el.modalEdicao.classList.add('modal-overlay--escondida');
  estado.transacaoEditando = null;
};

window.confirmarEdicao = async function() {
  const transacao  = estado.transacaoEditando;
  const novaDesc   = el.editDescricao.value.trim();
  const novoValor  = parseFloat(el.editValor.value);
  const novoTipo   = document.querySelector('input[name="tipo-edit"]:checked')?.value;
  el.erroEdicao.textContent = '';
  if (!novaDesc)                   { el.erroEdicao.textContent = 'Informe a descrição.'; return; }
  if (!novoValor || novoValor <= 0) { el.erroEdicao.textContent = 'Informe um valor válido.'; return; }
  if (!novoTipo)                   { el.erroEdicao.textContent = 'Selecione o tipo.'; return; }
  const btn = document.getElementById('btn-confirmar-edicao');
  btn.disabled = true; btn.textContent = 'Salvando...';
  const { uid }         = estado.usuarioAtual;
  const jaAbatido       = transacao.valor - (transacao.valorRestante !== undefined ? transacao.valorRestante : transacao.valor);
  const novoRestante    = Math.max(0, +(novoValor - jaAbatido).toFixed(2));
  await updateDoc(doc(db, 'usuarios', uid, 'meses', estado.mesAtualId, 'transacoes', transacao.id), {
    descricao: novaDesc, valor: novoValor, valorRestante: novoRestante, tipo: novoTipo,
  });
  await updateDoc(docMes(uid, estado.mesAtualId), { ultimaEdicao: serverTimestamp() });
  await registrarLog(uid, estado.mesAtualId, 'editou', { descricao: novaDesc, valor: novoValor, extra: `era: ${transacao.descricao} / R$${transacao.valor}` });
  btn.disabled = false; btn.textContent = 'Salvar alterações';
  fecharModalEdicao();
};

window.abrirModalMultiMes = function() {
  el.erroMultiMes.textContent = '';
  el.descMultiMes.value       = '';
  el.valorMultiMes.value      = '';
  document.querySelectorAll('input[name="tipo-multi"]').forEach(r => r.checked = false);
  el.listaMultiMes.innerHTML = estado.mesesDisponiveis.length === 0
    ? '<p style="color:var(--cor-texto-suave);font-size:.85rem">Nenhum mês disponível.</p>'
    : estado.mesesDisponiveis.map(m => `
        <label class="checkbox-mes">
          <input type="checkbox" name="mes-check" value="${m.id}" />
          <span>${m.nome}</span>
        </label>`).join('');
  el.modalMultiMes.classList.remove('modal-overlay--escondida');
};

window.fecharModalMultiMes = function() {
  el.modalMultiMes.classList.add('modal-overlay--escondida');
};

window.confirmarMultiMes = async function() {
  el.erroMultiMes.textContent = '';
  const descricao  = el.descMultiMes.value.trim();
  const valor      = parseFloat(el.valorMultiMes.value);
  const tipo       = document.querySelector('input[name="tipo-multi"]:checked')?.value;
  const checkboxes = [...document.querySelectorAll('input[name="mes-check"]:checked')];
  if (!descricao)              { el.erroMultiMes.textContent = 'Informe a descrição.'; return; }
  if (!valor || valor <= 0)    { el.erroMultiMes.textContent = 'Informe um valor válido.'; return; }
  if (!tipo)                   { el.erroMultiMes.textContent = 'Selecione o tipo.'; return; }
  if (checkboxes.length === 0) { el.erroMultiMes.textContent = 'Selecione ao menos um mês.'; return; }
  const btn = document.getElementById('btn-confirmar-multi');
  btn.disabled = true; btn.textContent = 'Salvando...';
  const { uid } = estado.usuarioAtual;
  await Promise.all(checkboxes.map(cb => salvarTransacaoNoMes(uid, cb.value, { descricao, valor, valorRestante: valor, tipo })));
  btn.disabled = false; btn.textContent = 'Lançar em todos';
  fecharModalMultiMes();
};

window.abrirModalAbatimento = async function(transacaoId) {
  const transacao = estado.transacoes.find(t => t.id === transacaoId);
  if (!transacao) return;
  estado.transacaoAbatendo      = transacao;
  el.erroAbatimento.textContent = '';
  el.valorAbatimento.value      = '';
  el.descAbatimento.value       = '';
  const valorRestante = transacao.valorRestante !== undefined ? transacao.valorRestante : transacao.valor;
  el.modalInfo.innerHTML = `<strong>${transacao.descricao}</strong><br>Original: ${fmt(transacao.valor)} &nbsp;|&nbsp; Restante: <strong>${fmt(valorRestante)}</strong>`;
  await carregarHistoricoAbatimentos(transacaoId);
  el.modalAbatimento.classList.remove('modal-overlay--escondida');
};

async function carregarHistoricoAbatimentos(transacaoId) {
  const { uid } = estado.usuarioAtual;
  const q = query(colAbatimentos(uid, estado.mesAtualId, transacaoId), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) { el.modalHistorico.innerHTML = ''; return; }
  el.modalHistorico.innerHTML = `
    <p class="historico-titulo">Histórico de abatimentos</p>
    ${snap.docs.map(d => {
      const ab = d.data();
      const data = new Date(ab.criadoEm).toLocaleDateString('pt-BR');
      return `<div class="historico-item"><span>${ab.descricao || 'Abatimento'} · ${data}</span><span>- ${fmt(ab.valor)}</span></div>`;
    }).join('')}`;
}

window.fecharModalAbatimento = function() {
  el.modalAbatimento.classList.add('modal-overlay--escondida');
  estado.transacaoAbatendo = null;
};

window.confirmarAbatimento = async function() {
  const transacao     = estado.transacaoAbatendo;
  const valorAbater   = parseFloat(el.valorAbatimento.value);
  const descricaoAb   = el.descAbatimento.value.trim() || 'Abatimento';
  const valorRestante = transacao.valorRestante !== undefined ? transacao.valorRestante : transacao.valor;
  el.erroAbatimento.textContent = '';
  if (!valorAbater || valorAbater <= 0) { el.erroAbatimento.textContent = 'Informe um valor válido.'; return; }
  if (valorAbater > valorRestante)      { el.erroAbatimento.textContent = `Máximo: ${fmt(valorRestante)}`; return; }
  const { uid }      = estado.usuarioAtual;
  const novoRestante = +(valorRestante - valorAbater).toFixed(2);
  await addDoc(colAbatimentos(uid, estado.mesAtualId, transacao.id), { valor: valorAbater, descricao: descricaoAb, criadoEm: new Date().toISOString() });
  await updateDoc(doc(db, 'usuarios', uid, 'meses', estado.mesAtualId, 'transacoes', transacao.id), { valorRestante: novoRestante });
  await updateDoc(docMes(uid, estado.mesAtualId), { ultimaEdicao: serverTimestamp() });
  await registrarLog(uid, estado.mesAtualId, 'abateu', { descricao: transacao.descricao, valor: valorAbater });
  fecharModalAbatimento();
};

function renderizarLancamentos() {
  renderizarLista();
  atualizarResumo();
  renderizarIndicador();
}

function renderizarLista() {
  if (estado.transacoes.length === 0) {
    el.lista.innerHTML = '<li class="lista-transacoes__vazia">Nenhuma transação ainda. Adicione uma acima. ✦</li>';
    return;
  }
  el.lista.innerHTML = estado.transacoes.map(t => {
    const vr      = t.valorRestante !== undefined ? t.valorRestante : t.valor;
    const abatido = vr < t.valor;
    const sinal   = t.tipo === 'entrada' ? '+' : '-';
    const cls     = t.tipo === 'entrada' ? 'transacao--entrada' : 'transacao--saida';
    return `
      <li class="transacao ${cls}">
        <div class="transacao__info">
          <span class="transacao__descricao">${t.descricao}</span>
          ${abatido ? `<span class="transacao__abatido">Restante: ${fmt(vr)} de ${fmt(t.valor)}</span>` : ''}
        </div>
        <span class="transacao__valor">${sinal} ${fmt(vr)}</span>
        <div class="transacao__acoes">
          <button class="transacao__btn transacao__btn--editar" onclick="abrirModalEdicao('${t.id}')" title="Editar">✎</button>
          ${t.tipo === 'saida' ? `<button class="transacao__btn transacao__btn--abater" onclick="abrirModalAbatimento('${t.id}')" title="Abater">⊖</button>` : ''}
          <button class="transacao__btn transacao__btn--remover" onclick="removerTransacao('${t.id}')" title="Remover">✕</button>
        </div>
      </li>`;
  }).join('');
}

function atualizarResumo() {
  const entradas = estado.transacoes.filter(t => t.tipo === 'entrada').reduce((a, t) => a + (t.valorRestante !== undefined ? t.valorRestante : t.valor), 0);
  const saidas   = estado.transacoes.filter(t => t.tipo === 'saida').reduce((a, t) => a + (t.valorRestante !== undefined ? t.valorRestante : t.valor), 0);
  const saldo    = entradas - saidas;
  el.totalEntradas.textContent = fmt(entradas);
  el.totalSaidas.textContent   = fmt(saidas);
  el.saldoTotal.textContent    = fmt(saldo);
  el.cardSaldo.classList.toggle('saldo-negativo', saldo < 0);
}

window.abrirHistoricoAtividades = async function() {
  el.modalHistoricoAtiv.classList.remove('modal-overlay--escondida');
  el.listaLogs.innerHTML = '<p style="color:var(--cor-texto-suave);font-size:.85rem;text-align:center;padding:1rem">Carregando...</p>';
  const { uid } = estado.usuarioAtual;
  const q = query(colLogs(uid, estado.mesAtualId), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) {
    el.listaLogs.innerHTML = '<p style="color:var(--cor-texto-suave);font-size:.85rem;text-align:center;padding:1rem">Nenhuma atividade registrada ainda.</p>';
    return;
  }
  const icones = { adicionou: '＋', removeu: '✕', editou: '✎', abateu: '⊖' };
  const cores  = { adicionou: 'var(--cor-entrada)', removeu: 'var(--cor-saida)', editou: 'var(--cor-acento)', abateu: 'var(--cor-alerta)' };
  el.listaLogs.innerHTML = snap.docs.map(d => {
    const log  = d.data();
    const data = new Date(log.criadoEm);
    const dataFmt = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const icone = icones[log.acao] || '●';
    const cor   = cores[log.acao]  || 'var(--cor-texto-suave)';
    return `
      <div class="log-item">
        <span class="log-item__icone" style="color:${cor}">${icone}</span>
        <div class="log-item__info">
          <span class="log-item__acao">${log.acao.charAt(0).toUpperCase() + log.acao.slice(1)} <strong>${log.descricao}</strong>${log.valor ? ` — ${fmt(log.valor)}` : ''}</span>
          ${log.extra ? `<span class="log-item__extra">${log.extra}</span>` : ''}
          <span class="log-item__data">${dataFmt} às ${horaFmt}</span>
        </div>
      </div>`;
  }).join('');
};

window.fecharHistoricoAtividades = function() {
  el.modalHistoricoAtiv.classList.add('modal-overlay--escondida');
};


async function carregarMetaMes(uid, mesId) {
  const snap = await getDocs(query(collection(db, 'usuarios', uid, 'meses', mesId, 'config')));
  if (!snap.empty) {
    const cfg = snap.docs[0].data();
    estado.metaMes = cfg.metaRenda || null;
  } else {
    estado.metaMes = null;
  }
}

async function salvarMetaMes(uid, mesId, valor) {
  const colConfig = collection(db, 'usuarios', uid, 'meses', mesId, 'config');
  const snap = await getDocs(colConfig);
  if (!snap.empty) {
    await updateDoc(doc(db, 'usuarios', uid, 'meses', mesId, 'config', snap.docs[0].id), { metaRenda: valor });
  } else {
    await addDoc(colConfig, { metaRenda: valor });
  }
  estado.metaMes = valor;
  renderizarIndicador();
}

function renderizarIndicador() {
  const painel = document.getElementById('painel-5030-20');
  if (!painel) return;

  const entradas = estado.transacoes.filter(t => t.tipo === 'entrada').reduce((a, t) => a + (t.valorRestante !== undefined ? t.valorRestante : t.valor), 0);
  const saidas   = estado.transacoes.filter(t => t.tipo === 'saida').reduce((a, t) => a + (t.valorRestante !== undefined ? t.valorRestante : t.valor), 0);
  const base     = estado.metaMes || entradas || 0;

  if (base === 0) {
    painel.innerHTML = `
      <div class="indicador-vazio">
        <span>Configure sua renda de referência para ver o indicador 50-30-20</span>
        <button class="botao-configurar-meta" onclick="abrirModalMeta()">Configurar</button>
      </div>`;
    return;
  }

  const pNecessidades = Math.min(100, +((saidas / base) * 100).toFixed(1));
  const pSaldo        = Math.max(0,  +((( base - saidas) / base) * 100).toFixed(1));

  const meta50 = base * 0.5;
  const meta20 = base * 0.2;
  const sobra  = base - saidas;
  const poupanca = sobra > 0 ? sobra : 0;

  const statusSaidas   = saidas   > meta50  ? 'critico'  : saidas > base * 0.4 ? 'atencao' : 'positivo';
  const statusPoupanca = poupanca >= meta20  ? 'positivo' : poupanca > 0 ? 'atencao' : 'critico';

  const cores = { positivo: 'var(--cor-entrada)', atencao: 'var(--cor-alerta)', critico: 'var(--cor-saida)' };

  painel.innerHTML = `
    <div class="indicador-header">
      <span class="indicador-titulo">Regra 50-30-20</span>
      <button class="botao-configurar-meta" onclick="abrirModalMeta()" title="Configurar renda de referência">⚙ ${estado.metaMes ? fmt(estado.metaMes) : 'Configurar'}</button>
    </div>
    <div class="indicador-barra-wrap">
      <div class="indicador-barra-label">
        <span>Gastos</span>
        <span style="color:${cores[statusSaidas]}">${fmt(saidas)} <small>(${pNecessidades}% / meta 50%)</small></span>
      </div>
      <div class="indicador-barra">
        <div class="indicador-barra__fill indicador-barra__fill--${statusSaidas}" style="width:${Math.min(pNecessidades, 100)}%"></div>
        <div class="indicador-barra__meta" style="left:50%"></div>
      </div>
    </div>
    <div class="indicador-barra-wrap">
      <div class="indicador-barra-label">
        <span>Disponível / Poupança</span>
        <span style="color:${cores[statusPoupanca]}">${fmt(poupanca)} <small>(${pSaldo}% / meta 20%)</small></span>
      </div>
      <div class="indicador-barra">
        <div class="indicador-barra__fill indicador-barra__fill--${statusPoupanca}" style="width:${Math.min(pSaldo, 100)}%"></div>
        <div class="indicador-barra__meta" style="left:20%"></div>
      </div>
    </div>
    <div class="indicador-resumo">
      <span class="indicador-resumo__item indicador-resumo__item--${statusSaidas}">Gastos: ${pNecessidades}%</span>
      <span class="indicador-resumo__item indicador-resumo__item--${statusPoupanca}">Sobra: ${pSaldo}%</span>
      <span class="indicador-resumo__item ${poupanca >= meta20 ? 'indicador-resumo__item--positivo' : 'indicador-resumo__item--critico'}">Meta 20% atingida: ${poupanca >= meta20 ? 'Sim ✓' : 'Não ✗'}</span>
    </div>`;
}

window.abrirModalMeta = function() {
  const modal = document.getElementById('modal-meta');
  const input = document.getElementById('input-meta-renda');
  input.value = estado.metaMes || '';
  document.getElementById('erro-meta').textContent = '';
  modal.classList.remove('modal-overlay--escondida');
  setTimeout(() => input.focus(), 50);
};

window.fecharModalMeta = function() {
  document.getElementById('modal-meta').classList.add('modal-overlay--escondida');
};

window.salvarConfigMeta = async function() {
  const input = document.getElementById('input-meta-renda');
  const valor = parseFloat(input.value);
  if (!valor || valor <= 0) {
    document.getElementById('erro-meta').textContent = 'Informe um valor válido.';
    return;
  }
  const btn = document.getElementById('btn-salvar-meta');
  btn.disabled = true; btn.textContent = 'Salvando...';
  const { uid } = estado.usuarioAtual;
  await salvarMetaMes(uid, estado.mesAtualId, valor);
  btn.disabled = false; btn.textContent = 'Salvar';
  fecharModalMeta();
};


onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    estado.usuarioAtual         = usuario;
    el.usuarioNome.textContent  = usuario.displayName || usuario.email;
    el.usuarioNome2.textContent = usuario.displayName || usuario.email;
    mostrarTela('tela-meses');
    escutarMeses(usuario.uid);
  } else {
    estado.usuarioAtual = null;
    mostrarTela('tela-auth');
  }
});