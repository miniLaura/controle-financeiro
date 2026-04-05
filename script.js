import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
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

const app        = initializeApp(firebaseConfig);
const auth       = getAuth(app);
const db         = getFirestore(app);


const elementos = {
  telaAuth:       document.getElementById('tela-auth'),
  appPrincipal:   document.getElementById('app-principal'),
  // Auth
  formLogin:      document.getElementById('form-login'),
  formCadastro:   document.getElementById('form-cadastro'),
  loginEmail:     document.getElementById('login-email'),
  loginSenha:     document.getElementById('login-senha'),
  erroLogin:      document.getElementById('erro-login'),
  cadastroNome:   document.getElementById('cadastro-nome'),
  cadastroEmail:  document.getElementById('cadastro-email'),
  cadastroSenha:  document.getElementById('cadastro-senha'),
  erroCadastro:   document.getElementById('erro-cadastro'),
  // App
  usuarioNome:    document.getElementById('usuario-nome'),
  formulario:     document.getElementById('formulario-transacao'),
  descricao:      document.getElementById('descricao'),
  valor:          document.getElementById('valor'),
  lista:          document.getElementById('lista-transacoes'),
  saldoTotal:     document.getElementById('saldo-total'),
  totalEntradas:  document.getElementById('total-entradas'),
  totalSaidas:    document.getElementById('total-saidas'),
  cardSaldo:      document.querySelector('.card--saldo'),
};


const estado = {
  usuarioAtual: null,
  transacoes:   [],
  unsubscribe:  null,
};




window.trocarAba = function(aba) {
  const abas   = { login: 'aba-login',    cadastro: 'aba-cadastro' };
  const formas = { login: 'form-login',   cadastro: 'form-cadastro' };

  Object.keys(abas).forEach((k) => {
    document.getElementById(abas[k]).classList.toggle('auth-aba--ativa', k === aba);
    document.getElementById(formas[k]).classList.toggle('auth-form--escondido', k !== aba);
  });

  elementos.erroLogin.textContent   = '';
  elementos.erroCadastro.textContent = '';
};


function traduzirErro(codigo) {
  const erros = {
    'auth/invalid-email':            'E-mail inválido.',
    'auth/user-not-found':           'Usuário não encontrado.',
    'auth/wrong-password':           'Senha incorreta.',
    'auth/email-already-in-use':     'Este e-mail já está cadastrado.',
    'auth/weak-password':            'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests':        'Muitas tentativas. Aguarde um momento.',
    'auth/invalid-credential':       'E-mail ou senha incorretos.',
  };
  return erros[codigo] || 'Ocorreu um erro. Tente novamente.';
}

function setCarregando(botaoId, carregando) {
  const btn = document.getElementById(botaoId);
  btn.disabled = carregando;
  btn.classList.toggle('botao-primario--carregando', carregando);
  btn.textContent = carregando ? 'Aguarde...' : (botaoId === 'btn-login' ? 'Entrar' : 'Criar conta');
}


elementos.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  elementos.erroLogin.textContent = '';
  setCarregando('btn-login', true);

  try {
    await signInWithEmailAndPassword(
      auth,
      elementos.loginEmail.value.trim(),
      elementos.loginSenha.value
    );
  } catch (erro) {
    elementos.erroLogin.textContent = traduzirErro(erro.code);
    setCarregando('btn-login', false);
  }
});


elementos.formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();
  elementos.erroCadastro.textContent = '';
  setCarregando('btn-cadastro', true);

  const nome  = elementos.cadastroNome.value.trim();
  const email = elementos.cadastroEmail.value.trim();
  const senha = elementos.cadastroSenha.value;

  if (!nome) {
    elementos.erroCadastro.textContent = 'Informe seu nome.';
    setCarregando('btn-cadastro', false);
    return;
  }

  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(credencial.user, { displayName: nome });
  } catch (erro) {
    elementos.erroCadastro.textContent = traduzirErro(erro.code);
    setCarregando('btn-cadastro', false);
  }
});


window.sair = async function() {
  if (estado.unsubscribe) estado.unsubscribe();
  await signOut(auth);
};




function colecaoTransacoes(uid) {
  return collection(db, 'usuarios', uid, 'transacoes');
}


function escutarTransacoes(uid) {
  const q = query(colecaoTransacoes(uid), orderBy('data', 'desc'));

  estado.unsubscribe = onSnapshot(q, (snapshot) => {
    estado.transacoes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderizar();
  });
}

async function salvarTransacao(transacao) {
  const uid = estado.usuarioAtual.uid;
  await addDoc(colecaoTransacoes(uid), transacao);
}

window.removerTransacao = async function(id) {
  const confirmacao = confirm('Deseja remover esta transação?');
  if (!confirmacao) return;

  const uid = estado.usuarioAtual.uid;
  await deleteDoc(doc(db, 'usuarios', uid, 'transacoes', id));
};



function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function criarHTMLTransacao(transacao) {
  const sinal  = transacao.tipo === 'entrada' ? '+' : '-';
  const classe = transacao.tipo === 'entrada' ? 'transacao--entrada' : 'transacao--saida';
  return `
    <li class="transacao ${classe}" data-id="${transacao.id}">
      <div class="transacao__info">
        <span class="transacao__descricao">${transacao.descricao}</span>
        <span class="transacao__data">${formatarData(transacao.data)}</span>
      </div>
      <span class="transacao__valor">${sinal} ${formatarMoeda(transacao.valor)}</span>
      <button class="transacao__remover" onclick="removerTransacao('${transacao.id}')" title="Remover">✕</button>
    </li>
  `;
}

function renderizarLista() {
  if (estado.transacoes.length === 0) {
    elementos.lista.innerHTML = `<li class="lista-transacoes__vazia">Nenhuma transação ainda. Adicione uma acima. ✦</li>`;
    return;
  }
  elementos.lista.innerHTML = estado.transacoes.map(criarHTMLTransacao).join('');
}

function atualizarResumo() {
  const entradas = estado.transacoes.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0);
  const saidas   = estado.transacoes.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0);
  const saldo    = entradas - saidas;

  elementos.totalEntradas.textContent = formatarMoeda(entradas);
  elementos.totalSaidas.textContent   = formatarMoeda(saidas);
  elementos.saldoTotal.textContent    = formatarMoeda(saldo);
  elementos.cardSaldo.classList.toggle('saldo-negativo', saldo < 0);
}

function renderizar() {
  renderizarLista();
  atualizarResumo();
}

function mostrarApp(usuario) {
  elementos.telaAuth.style.display      = 'none';
  elementos.appPrincipal.style.display  = 'flex';
  elementos.appPrincipal.style.flexDirection = 'column';
  elementos.usuarioNome.textContent = usuario.displayName || usuario.email;
  escutarTransacoes(usuario.uid);
}

function mostrarAuth() {
  elementos.telaAuth.style.display     = 'flex';
  elementos.appPrincipal.style.display = 'none';
  estado.transacoes = [];
}


elementos.formulario.addEventListener('submit', async (e) => {
  e.preventDefault();

  const descricao = elementos.descricao.value.trim();
  const valor     = parseFloat(elementos.valor.value);
  const tipo      = document.querySelector('input[name="tipo"]:checked')?.value;

  if (!descricao || !valor || valor <= 0 || !tipo) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const btn = document.getElementById('btn-adicionar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  await salvarTransacao({
    descricao,
    valor,
    tipo,
    data: new Date().toISOString(),
  });

  elementos.formulario.reset();
  btn.disabled = false;
  btn.textContent = 'Adicionar Transação';
});


onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    estado.usuarioAtual = usuario; 
    mostrarApp(usuario);
  } else {
    estado.usuarioAtual = null; 
    mostrarAuth();
  }
});