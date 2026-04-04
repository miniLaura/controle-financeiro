
'use strict';

const elementos = {
  formulario:    document.getElementById('formulario-transacao'),
  descricao:     document.getElementById('descricao'),
  valor:         document.getElementById('valor'),
  lista:         document.getElementById('lista-transacoes'),
  saldoTotal:    document.getElementById('saldo-total'),
  totalEntradas: document.getElementById('total-entradas'),
  totalSaidas:   document.getElementById('total-saidas'),
  cardSaldo:     document.querySelector('.card--saldo'),
};


const estado = {
  transacoes: [],
};



function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function criarHTMLTransacao(transacao) {
  const sinal = transacao.tipo === 'entrada' ? '+' : '-';
  const classe = transacao.tipo === 'entrada' ? 'transacao--entrada' : 'transacao--saida';

  return `
    <li class="transacao ${classe}" data-id="${transacao.id}">
      <div class="transacao__info">
        <span class="transacao__descricao">${transacao.descricao}</span>
        <span class="transacao__data">${formatarData(transacao.data)}</span>
      </div>
      <span class="transacao__valor">
        ${sinal} ${formatarMoeda(transacao.valor)}
      </span>
      <button
        class="transacao__remover"
        onclick="removerTransacao('${transacao.id}')"
        title="Remover transação"
        aria-label="Remover ${transacao.descricao}"
      >✕</button>
    </li>
  `;
}

function renderizarLista() {
  const { transacoes } = estado;

  if (transacoes.length === 0) {
    elementos.lista.innerHTML = `
      <li class="lista-transacoes__vazia">
        Nenhuma transação ainda. Adicione uma acima. ✦
      </li>
    `;
    return;
  }

  const htmlItens = [...transacoes]
    .reverse()
    .map(criarHTMLTransacao)
    .join('');

  elementos.lista.innerHTML = htmlItens;
}

function atualizarResumo() {
  const { transacoes } = estado;

  const totalEntradas = transacoes
    .filter((t) => t.tipo === 'entrada')
    .reduce((acumulador, t) => acumulador + t.valor, 0);

  const totalSaidas = transacoes
    .filter((t) => t.tipo === 'saida')
    .reduce((acumulador, t) => acumulador + t.valor, 0);

  const saldo = totalEntradas - totalSaidas;

  elementos.totalEntradas.textContent = formatarMoeda(totalEntradas);
  elementos.totalSaidas.textContent   = formatarMoeda(totalSaidas);
  elementos.saldoTotal.textContent    = formatarMoeda(saldo);

  if (saldo < 0) {
    elementos.cardSaldo.classList.add('saldo-negativo');
  } else {
    elementos.cardSaldo.classList.remove('saldo-negativo');
  }
}

function renderizar() {
  renderizarLista();
  atualizarResumo();
}



function obterTipoSelecionado() {
  const radioSelecionado = document.querySelector('input[name="tipo"]:checked');
  return radioSelecionado ? radioSelecionado.value : null;
}

function validarFormulario(descricao, valor, tipo) {
  if (!descricao) {
    alert('Por favor, informe uma descrição.');
    elementos.descricao.focus();
    return false;
  }
  if (!valor || valor <= 0) {
    alert('Por favor, informe um valor válido maior que zero.');
    elementos.valor.focus();
    return false;
  }
  if (!tipo) {
    alert('Por favor, selecione o tipo: Entrada ou Saída.');
    return false;
  }
  return true;
}

function adicionarTransacao(descricao, valor, tipo) {
  const novaTransacao = {
    id:        Date.now().toString(),
    descricao: descricao,
    valor:     parseFloat(valor),
    tipo:      tipo,
    data:      new Date().toISOString(),
  };
  estado.transacoes.push(novaTransacao);
}

function removerTransacao(id) {
  const confirmacao = confirm('Deseja remover esta transação?');
  if (!confirmacao) return;

  estado.transacoes = estado.transacoes.filter((t) => t.id !== id);
  salvarNoStorage();
  renderizar();
}

function limparFormulario() {
  elementos.formulario.reset();
}



function salvarNoStorage() {
  localStorage.setItem(
    'controleFinanceiro:transacoes',
    JSON.stringify(estado.transacoes)
  );
}

function carregarDoStorage() {
  const dadosSalvos = localStorage.getItem('controleFinanceiro:transacoes');
  estado.transacoes = dadosSalvos ? JSON.parse(dadosSalvos) : [];
}


elementos.formulario.addEventListener('submit', function (evento) {
  evento.preventDefault();

  const descricao = elementos.descricao.value.trim();
  const valor     = parseFloat(elementos.valor.value);
  const tipo      = obterTipoSelecionado();

  if (!validarFormulario(descricao, valor, tipo)) return;

  adicionarTransacao(descricao, valor, tipo);
  salvarNoStorage();
  renderizar();
  limparFormulario();
});

function inicializar() {
  carregarDoStorage();
  renderizar();
  console.log('✅ Controle Financeiro Inteligente — iniciado com sucesso.');
}

inicializar();
