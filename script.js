/**
 * Controle Financeiro Inteligente
 * ================================
 * Autor: [seu nome aqui]
 * Descrição: Aplicação de controle financeiro pessoal
 *            com persistência em localStorage.
 *
 * Estrutura do arquivo:
 *  1. Seleção de elementos do DOM
 *  2. Estado da aplicação
 *  3. Funções de renderização
 *  4. Funções de lógica / negócio
 *  5. Funções de persistência (localStorage)
 *  6. Eventos
 *  7. Inicialização
 */

'use strict';

/* ============================================================
   1. SELEÇÃO DE ELEMENTOS DO DOM
   Centralizar aqui evita buscas repetidas no DOM,
   o que melhora performance e legibilidade.
   ============================================================ */
const elementos = {
  formulario:     document.getElementById('formulario-transacao'),
  descricao:      document.getElementById('descricao'),
  valor:          document.getElementById('valor'),
  lista:          document.getElementById('lista-transacoes'),
  saldoTotal:     document.getElementById('saldo-total'),
  totalEntradas:  document.getElementById('total-entradas'),
  totalSaidas:    document.getElementById('total-saidas'),
  cardSaldo:      document.querySelector('.card--saldo'),
};

/* ============================================================
   2. ESTADO DA APLICAÇÃO
   Toda a aplicação gira em torno deste objeto.
   A "fonte da verdade" é sempre o array de transações.
   ============================================================ */
const estado = {
  transacoes: [],
};

/* ============================================================
   3. FUNÇÕES DE RENDERIZAÇÃO
   Responsáveis por atualizar o DOM com base no estado.
   ============================================================ */

// TODO — Etapa 2: implementar renderizarLista()
// TODO — Etapa 2: implementar atualizarResumo()
// TODO — Etapa 2: implementar formatarMoeda()

/* ============================================================
   4. FUNÇÕES DE LÓGICA / NEGÓCIO
   ============================================================ */

// TODO — Etapa 2: implementar adicionarTransacao()
// TODO — Etapa 3: implementar removerTransacao()

/* ============================================================
   5. FUNÇÕES DE PERSISTÊNCIA
   ============================================================ */

// TODO — Etapa 4: implementar salvarNoStorage()
// TODO — Etapa 4: implementar carregarDoStorage()

/* ============================================================
   6. EVENTOS
   ============================================================ */

// TODO — Etapa 2: adicionar listener no formulário

/* ============================================================
   7. INICIALIZAÇÃO
   ============================================================ */

// TODO — Etapa 4: chamar carregarDoStorage() aqui

// Verificação de que o JS carregou corretamente
console.log('✅ Controle Financeiro Inteligente — script carregado.');
console.log('📦 Elementos do DOM:', elementos);
