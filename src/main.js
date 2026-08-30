import { db, generateUUID } from './db.js';

// Seleciona os elementos da tela
const btnNovaLista = document.getElementById('btn-nova-lista');
const modalLista = document.getElementById('modal-lista');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnSalvarLista = document.getElementById('btn-salvar-lista');
const listasContainer = document.getElementById('listas-container');
const emptyState = document.getElementById('empty-state');

// Controle do Modal
btnNovaLista.addEventListener('click', () => {
  document.getElementById('input-nome-lista').value = '';
  document.getElementById('input-orcamento-lista').value = '';
  modalLista.style.display = 'flex';
});

btnFecharModal.addEventListener('click', () => {
  modalLista.style.display = 'none';
});

// Criar Nova Lista
btnSalvarLista.addEventListener('click', async () => {
  const nome = document.getElementById('input-nome-lista').value;
  const orcamento = parseFloat(document.getElementById('input-orcamento-lista').value) || 0;

  if (!nome) return alert('Dê um nome para a sua lista!');

  const novaLista = {
    id: generateUUID(),
    nome: nome,
    categoria: 'mercado', // Fixo por enquanto, depois adicionaremos os ícones de volta
    orcamento: orcamento,
    created_at: new Date().toISOString(),
    user_id: 'local' // Como combinado, listas locais recebem 'local'
  };

  // Salva no IndexedDB super rápido
  await db.listas.add(novaLista);
  modalLista.style.display = 'none';
  
  // Atualiza a tela
  carregarListas();
});

// Carregar e exibir as listas
async function carregarListas() {
  const listas = await db.listas.toArray();
  
  listasContainer.innerHTML = ''; // Limpa a tela

  if (listas.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  listas.forEach(lista => {
    const dataFormatada = new Date(lista.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    // Cria o cartão dinamicamente
    const card = document.createElement('div');
    card.className = 'lista-card';
    card.innerHTML = `
      <div class="card-header">
        <h3>${lista.nome}</h3>
        <span style="color: var(--text-muted); font-size: 0.85rem;">${dataFormatada}</span>
      </div>
      <div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Limite: R$ ${lista.orcamento.toFixed(2)}</p>
      </div>
    `;

    // Ao clicar no cartão, vai para a página de itens
    card.addEventListener('click', () => {
      window.location.href = `/lista.html?id=${lista.id}`;
    });

    listasContainer.appendChild(card);
  });
}

// Inicializa carregando as listas ao abrir o app
carregarListas();