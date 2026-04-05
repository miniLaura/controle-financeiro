import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query, orderBy, getDocs, getDoc,
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


const estado = {
  usuarioAtual:      null,
  mesAtualId:        null,
  mesAtualNome:      null,
  transacoes:        [],
  unsubTransacoes:   null, 
  unsubMeses:        null, 
  transacaoAbatendo: null,
  
}
frasesRodape: [
  "Funciona no sistema, na vida real ainda em teste",
  "Se não anotar, nem Deus sabe pra onde foi",
  "Commitando gastos desde sempre",
  "Confia no processo… e no limite do cartão",
  "Organizando hoje pra não chorar amanhã",
  "console.log('cadê meu dinheiro?')"
];

const el = {
  // Telas
  telaAuth:        document.getElementById('tela-auth'),
  telaMeses:       document.getElementById('tela-meses'),
  telaLancamentos: document.getElementById('tela-lancamentos'),
  // Auth
  formLogin:       document.getElementById('form-login'),
  formCadastro:    document.getElementById('form-cadastro'),
  loginEmail:      document.getElementById('login-email'),
  loginSenha:      document.getElementById('login-senha'),
  erroLogin:       document.getElementById('erro-login'),
  cadastroNome:    document.getElementById('cadastro-nome'),
  cadastroEmail:   document.getElementById('cadastro-email'),
  cadastroSenha:   document.getElementById('cadastro-senha'),
  erroCadastro:    document.getElementById('erro-cadastro'),
  // Meses
  usuarioNome:     document.getElementById('usuario-nome'),
  usuarioNome2:    document.getElementById('usuario-nome-2'),
  formNovoMes:     document.getElementById('form-novo-mes'),
  nomeMes:         document.getElementById('nome-mes'),
  gridMeses:       document.getElementById('grid-meses'),
  // Lançamentos
  tituloMesAtual:  document.getElementById('titulo-mes-atual'),
  formTransacao:   document.getElementById('formulario-transacao'),
  descricao:       document.getElementById('descricao'),
  valor:           document.getElementById('valor'),
  lista:           document.getElementById('lista-transacoes'),
  saldoTotal:      document.getElementById('saldo-total'),
  totalEntradas:   document.getElementById('total-entradas'),
  totalSaidas:     document.getElementById('total-saidas'),
  cardSaldo:       document.getElementById('card-saldo'),
  // Modal
  modalAbatimento: document.getElementById('modal-abatimento'),
  modalInfo:       document.getElementById('modal-info-transacao'),
  valorAbatimento: document.getElementById('valor-abatimento'),
  descAbatimento:  document.getElementById('descricao-abatimento'),
  erroAbatimento:  document.getElementById('erro-abatimento'),
  modalHistorico:  document.getElementById('modal-historico'),
};


function fmt(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function atualizarFraseRodape(saldo = 0) {
  const elRodape = document.getElementById("frase-rodape");
  if (!elRodape) return;

  let frases;

  if (saldo < 0) {
    frases = [
      "Deu ruim… mas seguimos firmes",
      "Saldo negativo, caráter positivo",
      "Era só um gasto… virou história"
    ];
  } else if (saldo === 0) {
    frases = [
      "Empate técnico financeiro",
      "Nem rico, nem falido… equilibrado"
    ];
  } else {
    frases = [
      "Aí sim, organização trazendo resultado",
      "Tá funcionando… até eu tô surpresa",
      "Gestão financeira nível avançado"
    ];
  }

  const frase = frases[Math.floor(Math.random() * frases.length)];

  elRodape.style.opacity = 0;

  setTimeout(() => {
    elRodape.textContent = frase;
    elRodape.style.opacity = 1;
  }, 300);
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
  btn.disabled = carregando;
  btn.classList.toggle('botao-primario--carregando', carregando);
  btn.textContent = carregando ? 'Aguarde...' : textoOriginal;
}


function mostrarTela(id) {
  ['tela-auth', 'tela-meses', 'tela-lancamentos'].forEach((telaId) => {
    document.getElementById(telaId).classList.toggle('tela--escondida', telaId !== id);
  });
}


window.trocarAba = function(aba) {
  document.getElementById('aba-login').classList.toggle('auth-aba--ativa', aba === 'login');
  document.getElementById('aba-cadastro').classList.toggle('auth-aba--ativa', aba === 'cadastro');
  document.getElementById('form-login').classList.toggle('auth-form--escondido', aba !== 'login');
  document.getElementById('form-cadastro').classList.toggle('auth-form--escondido', aba !== 'cadastro');
  el.erroLogin.textContent = '';
  el.erroCadastro.textContent = '';
};

el.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.erroLogin.textContent = '';
  setCarregando('btn-login', true, 'Entrar');
  try {
    await signInWithEmailAndPassword(auth, el.loginEmail.value.trim(), el.loginSenha.value);
  } catch (erro) {
    el.erroLogin.textContent = traduzirErro(erro.code);
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
  } catch (erro) {
    el.erroCadastro.textContent = traduzirErro(erro.code);
    setCarregando('btn-cadastro', false, 'Criar conta');
  }
});

window.sair = async function() {
  if (estado.unsubTransacoes) estado.unsubTransacoes();
  if (estado.unsubMeses)      estado.unsubMeses();
  estado.transacoes  = [];
  estado.mesAtualId  = null;
  await signOut(auth);
};


function colMeses(uid)        { return collection(db, 'usuarios', uid, 'meses'); }
function colTransacoes(uid, mesId) { return collection(db, 'usuarios', uid, 'meses', mesId, 'transacoes'); }
function colAbatimentos(uid, mesId, transacaoId) {
  return collection(db, 'usuarios', uid, 'meses', mesId, 'transacoes', transacaoId, 'abatimentos');
}


function escutarMeses(uid) {
  const q = query(colMeses(uid), orderBy('criadoEm', 'desc'));
  estado.unsubMeses = onSnapshot(q, async (snapshot) => {
    const meses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    await renderizarGridMeses(meses, uid);
  });
}


async function calcularTotaisMes(uid, mesId) {
  const snapshot = await getDocs(colTransacoes(uid, mesId));
  let entradas = 0, saidas = 0;
  snapshot.forEach(d => {
    const t = d.data();
    const valorRestante = t.valorRestante !== undefined ? t.valorRestante : t.valor;
    if (t.tipo === 'entrada') entradas += valorRestante;
    else                      saidas   += valorRestante;
  });
  return { entradas, saidas, saldo: entradas - saidas };
}


function statusMes(saldo, entradas) {
  if (entradas === 0 && saldo === 0) return 'neutro';
  if (saldo > 0)  return 'positivo';
  if (saldo === 0) return 'atencao';
  return 'critico';
}

async function renderizarGridMeses(meses, uid) {
  if (meses.length === 0) {
    el.gridMeses.innerHTML = '<p class="lista-transacoes__vazia">Nenhum mês criado ainda. Crie um acima. ✦</p>';
    return;
  }


  const totaisPromises = meses.map(m => calcularTotaisMes(uid, m.id));
  const totais = await Promise.all(totaisPromises);

  el.gridMeses.innerHTML = meses.map((mes, i) => {
    const { entradas, saidas, saldo } = totais[i];
    const status = statusMes(saldo, entradas);
    const badges = {
      positivo: '<span class="card-mes__badge badge--positivo">● Positivo</span>',
      atencao:  '<span class="card-mes__badge badge--atencao">● Atenção</span>',
      critico:  '<span class="card-mes__badge badge--critico">● Crítico</span>',
      neutro:   '<span class="card-mes__badge badge--neutro">— Sem dados</span>',
    };
    return `
      <div class="card-mes card-mes--${status}" onclick="abrirMes('${mes.id}', '${mes.nome.replace(/'/g, "\\'")}')">
        <div class="card-mes__header">
          <span class="card-mes__nome">${mes.nome}</span>
          ${badges[status]}
        </div>
        <div class="card-mes__linha"><span>Entradas</span><span style="color:var(--cor-entrada)">${fmt(entradas)}</span></div>
        <div class="card-mes__linha"><span>Saídas</span><span style="color:var(--cor-saida)">${fmt(saidas)}</span></div>
        <div class="card-mes__saldo">${fmt(saldo)}</div>
        <button class="card-mes__remover" onclick="removerMes(event,'${mes.id}')" title="Remover mês">✕</button>
      </div>
    `;
  }).join('');
}

el.formNovoMes.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = el.nomeMes.value.trim();
  if (!nome) return;
  const uid = estado.usuarioAtual.uid;
  await addDoc(colMeses(uid), { nome, criadoEm: new Date().toISOString() });
  el.nomeMes.value = '';
});

window.removerMes = async function(event, mesId) {
  event.stopPropagation(); 
  if (!confirm('Remover este mês e todas as transações?')) return;
  const uid = estado.usuarioAtual.uid;
  await deleteDoc(doc(db, 'usuarios', uid, 'meses', mesId));
};

window.abrirMes = function(mesId, mesNome) {
  estado.mesAtualId   = mesId;
  estado.mesAtualNome = mesNome;
  el.tituloMesAtual.textContent = mesNome;
  mostrarTela('tela-lancamentos');
  escutarTransacoes();
};

window.voltarParaMeses = function() {
  if (estado.unsubTransacoes) {
    estado.unsubTransacoes();
    estado.unsubTransacoes = null;
  }
  estado.mesAtualId  = null;
  estado.transacoes  = [];
  mostrarTela('tela-meses');
};


function escutarTransacoes() {
  const { uid } = estado.usuarioAtual;
  const mesId   = estado.mesAtualId;
  const q = query(colTransacoes(uid, mesId), orderBy('criadoEm', 'desc'));

  estado.unsubTransacoes = onSnapshot(q, (snapshot) => {
    estado.transacoes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizarLancamentos();
  });
}

el.formTransacao.addEventListener('submit', async (e) => {
  e.preventDefault();
  const descricao = el.descricao.value.trim();
  const valor     = parseFloat(el.valor.value);
  const tipo      = document.querySelector('input[name="tipo"]:checked')?.value;

  if (!descricao || !valor || valor <= 0 || !tipo) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const btn = document.getElementById('btn-adicionar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const { uid } = estado.usuarioAtual;
  await addDoc(colTransacoes(uid, estado.mesAtualId), {
    descricao,
    valor,
    valorRestante: valor, 
    tipo,
    criadoEm: new Date().toISOString(),
  });

  el.formTransacao.reset();
  btn.disabled = false;
  btn.textContent = 'Adicionar Transação';
});

window.removerTransacao = async function(id) {
  if (!confirm('Remover esta transação?')) return;
  const { uid } = estado.usuarioAtual;
  await deleteDoc(doc(db, 'usuarios', uid, 'meses', estado.mesAtualId, 'transacoes', id));
};


window.abrirModalAbatimento = async function(transacaoId) {
  const transacao = estado.transacoes.find(t => t.id === transacaoId);
  if (!transacao) return;

  estado.transacaoAbatendo = transacao;
  el.erroAbatimento.textContent = '';
  el.valorAbatimento.value      = '';
  el.descAbatimento.value       = '';

  const valorRestante = transacao.valorRestante !== undefined ? transacao.valorRestante : transacao.valor;
  el.modalInfo.innerHTML = `
    <strong>${transacao.descricao}</strong><br>
    Valor original: ${fmt(transacao.valor)} &nbsp;|&nbsp;
    Restante: <strong>${fmt(valorRestante)}</strong>
  `;


  await carregarHistoricoAbatimentos(transacaoId);

  el.modalAbatimento.classList.remove('modal-overlay--escondida');
};

async function carregarHistoricoAbatimentos(transacaoId) {
  const { uid } = estado.usuarioAtual;
  const col = colAbatimentos(uid, estado.mesAtualId, transacaoId);
  const q   = query(col, orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);

  if (snap.empty) {
    el.modalHistorico.innerHTML = '';
    return;
  }

  el.modalHistorico.innerHTML = `
    <p class="historico-titulo">Histórico de abatimentos</p>
    ${snap.docs.map(d => {
      const ab = d.data();
      const data = new Date(ab.criadoEm).toLocaleDateString('pt-BR');
      return `
        <div class="historico-item">
          <span>${ab.descricao || 'Abatimento'} · ${data}</span>
          <span>- ${fmt(ab.valor)}</span>
        </div>
      `;
    }).join('')}
  `;
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

  if (!valorAbater || valorAbater <= 0) {
    el.erroAbatimento.textContent = 'Informe um valor válido.';
    return;
  }
  if (valorAbater > valorRestante) {
    el.erroAbatimento.textContent = `Valor máximo permitido: ${fmt(valorRestante)}`;
    return;
  }

  const { uid }    = estado.usuarioAtual;
  const novoRestante = +(valorRestante - valorAbater).toFixed(2);


  await addDoc(
    colAbatimentos(uid, estado.mesAtualId, transacao.id),
    { valor: valorAbater, descricao: descricaoAb, criadoEm: new Date().toISOString() }
  );


  await updateDoc(
    doc(db, 'usuarios', uid, 'meses', estado.mesAtualId, 'transacoes', transacao.id),
    { valorRestante: novoRestante }
  );

  fecharModalAbatimento();
};


function renderizarLancamentos() {
  renderizarLista();
  atualizarResumo();
}

function renderizarLista() {
  if (estado.transacoes.length === 0) {
    el.lista.innerHTML = '<li class="lista-transacoes__vazia">Nenhuma transação ainda. Adicione uma acima. ✦</li>';
    return;
  }

  el.lista.innerHTML = estado.transacoes.map(t => {
    const valorRestante = t.valorRestante !== undefined ? t.valorRestante : t.valor;
    const temAbatimento = valorRestante < t.valor;
    const sinal = t.tipo === 'entrada' ? '+' : '-';
    const classe = t.tipo === 'entrada' ? 'transacao--entrada' : 'transacao--saida';

    return `
      <li class="transacao ${classe}">
        <div class="transacao__info">
          <span class="transacao__descricao">${t.descricao}</span>
          ${temAbatimento ? `<span class="transacao__abatido">Restante: ${fmt(valorRestante)} de ${fmt(t.valor)}</span>` : ''}
        </div>
        <span class="transacao__valor">${sinal} ${fmt(valorRestante)}</span>
        <div class="transacao__acoes">
          ${t.tipo === 'saida' ? `
            <button class="transacao__btn transacao__btn--abater"
              onclick="abrirModalAbatimento('${t.id}')"
              title="Registrar abatimento">⊖ Abater</button>
          ` : ''}
          <button class="transacao__btn transacao__btn--remover"
            onclick="removerTransacao('${t.id}')"
            title="Remover">✕</button>
        </div>
      </li>
    `;
  }).join('');
}

function atualizarResumo() {
  const entradas = estado.transacoes
    .filter(t => t.tipo === 'entrada')
    .reduce((a, t) => a + (t.valorRestante !== undefined ? t.valorRestante : t.valor), 0);

  const saidas = estado.transacoes
    .filter(t => t.tipo === 'saida')
    .reduce((a, t) => a + (t.valorRestante !== undefined ? t.valorRestante : t.valor), 0);

  const saldo = entradas - saidas;

  el.totalEntradas.textContent = fmt(entradas);
  el.totalSaidas.textContent   = fmt(saidas);
  el.saldoTotal.textContent    = fmt(saldo);
  el.cardSaldo.classList.toggle('saldo-negativo', saldo < 0);
  atualizarFraseRodape(saldo);
}


onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    estado.usuarioAtual = usuario;
    el.usuarioNome.textContent  = usuario.displayName || usuario.email;
    el.usuarioNome2.textContent = usuario.displayName || usuario.email;
    mostrarTela('tela-meses');
    escutarMeses(usuario.uid);
    setTimeout(() => atualizarFraseRodape(0), 300);
  } else {
    estado.usuarioAtual = null;
    mostrarTela('tela-auth');
  }
});

setInterval(() => {
  const texto = document.getElementById("saldo-total")?.textContent || "0";

  const saldoAtual = parseFloat(
    texto.replace(/[^\d,-]/g, '').replace(',', '.')
  ) || 0;

  atualizarFraseRodape(saldoAtual);
}, 6000);