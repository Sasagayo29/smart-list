import { db, generateUUID } from './db.js';
import * as XLSX from 'xlsx';

// 1. Pega o ID da lista que está na URL (ex: lista.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const listaId = urlParams.get('id');

// Se não tiver ID, chuta de volta pro Dashboard
if (!listaId) window.location.href = '/';

// 2. Seleciona Elementos da Ilha Dinâmica e Interface
const nomeListaIlha = document.getElementById('nome-lista-ilha');
const totalListaIlha = document.getElementById('total-lista-ilha');
const itensContainer = document.getElementById('itens-container');
const emptyState = document.getElementById('empty-state-itens');
const searchContainer = document.getElementById('search-container');
const inputBusca = document.getElementById('input-busca');

// Modais e Botões
const modalItem = document.getElementById('modal-item');
const btnAddItem = document.getElementById('btn-add-item');
const btnSalvarItem = document.getElementById('btn-salvar-item');
const btnFecharModal = document.getElementById('btn-fechar-modal-item');
const inputs = {
  nome: document.getElementById('input-nome-item'),
  qtd: document.getElementById('input-qtd-item'),
  preco: document.getElementById('input-preco-item')
};

// Navegação (Voltar)
document.getElementById('btn-voltar-nav').addEventListener('click', () => window.location.href = '/');
document.getElementById('btn-voltar-ilha').addEventListener('click', () => window.location.href = '/');

// 3. Função principal de carregar a lista e calcular o total
async function carregarDados() {
  const lista = await db.listas.get(listaId);
  if (lista) nomeListaIlha.textContent = lista.nome;

  const itens = await db.itens.where('lista_id').equals(listaId).toArray();
  
  // Atualiza a Ilha Dinâmica
  const total = itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
  totalListaIlha.textContent = `R$ ${total.toFixed(2)}`;

  // Controle de exibição (vazio ou com itens)
  itensContainer.innerHTML = '';
  if (itens.length === 0) {
    emptyState.style.display = 'block';
    searchContainer.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  searchContainer.style.display = 'flex';

  // Renderiza os cartões
  renderizarItens(itens);
}

// 4. Desenhar os itens na tela
function renderizarItens(itensArray) {
  itensContainer.innerHTML = '';
  itensArray.forEach(item => {
    const subtotal = item.quantidade * item.preco_unitario;
    
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-info">
        <h4>${item.nome}</h4>
        <span class="item-price">R$ ${item.preco_unitario.toFixed(2)} x ${item.quantidade}</span>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="item-subtotal">R$ ${subtotal.toFixed(2)}</div>
        <button class="btn-icon btn-excluir" data-id="${item.id}" style="color: var(--danger);">
          <span class="material-symbols-rounded">delete</span>
        </button>
      </div>
    `;
    itensContainer.appendChild(card);
  });

  // Adiciona evento de exclusão aos botões que acabaram de ser criados
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Excluir este item?')) {
        await db.itens.delete(id);
        carregarDados();
      }
    });
  });
}

// 5. Lógica do Modal (Abrir e Salvar)
btnAddItem.addEventListener('click', () => {
  inputs.nome.value = '';
  inputs.qtd.value = 1;
  inputs.preco.value = '';
  modalItem.style.display = 'flex';
});

btnFecharModal.addEventListener('click', () => modalItem.style.display = 'none');

btnSalvarItem.addEventListener('click', async () => {
  const nome = inputs.nome.value;
  const qtd = parseInt(inputs.qtd.value) || 1;
  const preco = parseFloat(inputs.preco.value) || 0;

  if (!nome) return alert('Insira o nome do produto!');

  const novoItem = {
    id: generateUUID(),
    lista_id: listaId,
    nome: nome,
    quantidade: qtd,
    preco_unitario: preco,
    comprado: false,
    user_id: 'local'
  };

  await db.itens.add(novoItem);
  modalItem.style.display = 'none';
  carregarDados(); // Recarrega os dados instantaneamente
});

// Busca em Tempo Real
inputBusca.addEventListener('input', async (e) => {
  const termo = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const todosItens = await db.itens.where('lista_id').equals(listaId).toArray();
  
  const itensFiltrados = todosItens.filter(item => {
    const nomeLimpo = item.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return nomeLimpo.includes(termo);
  });
  
  renderizarItens(itensFiltrados);
});

// ==========================================
// MÓDULO DE IMPORTAÇÃO (Excel e TXT)
// ==========================================
const inputImportar = document.getElementById('input-importar');

inputImportar.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const extensao = file.name.split('.').pop().toLowerCase();

  try {
    if (extensao === 'txt') {
      const texto = await file.text();
      await processarTXT(texto);
    } else if (extensao === 'xlsx' || extensao === 'csv') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const dados = XLSX.utils.sheet_to_json(worksheet);
      await processarExcel(dados);
    }
  } catch (error) {
    console.error("Erro na importação:", error);
    alert('Erro ao processar o arquivo. Verifique se o formato está correto.');
  }
  
  inputImportar.value = ''; // Limpa o input para permitir importar o mesmo arquivo de novo
});

// Leitor de Texto Simples
async function processarTXT(texto) {
  const linhas = texto.split('\n');
  
  for (const linha of linhas) {
    if (linha.trim() === '') continue;
    
    // Regra: O TXT deve ser separado por vírgulas. Ex: Arroz, 2, 25.50
    const partes = linha.split(',');
    const nome = partes[0].trim();
    const qtd = partes[1] ? parseInt(partes[1]) : 1;
    const preco = partes[2] ? parseFloat(partes[2]) : 0;

    await db.itens.add({
      id: generateUUID(),
      lista_id: listaId,
      nome: nome,
      quantidade: qtd,
      preco_unitario: preco,
      comprado: false,
      user_id: 'local'
    });
  }
  
  carregarDados();
  alert('Lista de texto importada com sucesso!');
}

// Leitor de Excel Automático
async function processarExcel(dados) {
  for (const linha of dados) {
    // O sistema é inteligente: ele procura colunas chamadas Nome, Produto, Quantidade, Qtd...
    const nome = linha.Nome || linha.nome || linha.Produto || linha.produto;
    if (!nome) continue; // Pula a linha se não tiver nome do produto
    
    const qtd = linha.Quantidade || linha.quantidade || linha.Qtd || 1;
    const preco = linha.Preco || linha.preco || linha.Valor || linha.valor || 0;

    await db.itens.add({
      id: generateUUID(),
      lista_id: listaId,
      nome: nome.toString(),
      quantidade: parseInt(qtd),
      preco_unitario: parseFloat(preco),
      comprado: false,
      user_id: 'local'
    });
  }
  
  carregarDados();
  alert('Planilha importada com sucesso!');
}

// Inicia
carregarDados();