import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';

// Registra o Service Worker para tornar o app instalável (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA: Service Worker registrado com sucesso!', reg.scope))
      .catch(err => console.error('PWA: Erro ao registrar Service Worker:', err));
  });
}

// Seleciona os elementos da tela
const btnNovaLista = document.getElementById('btn-nova-lista');
const modalLista = document.getElementById('modal-lista');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnSalvarLista = document.getElementById('btn-salvar-lista');
const listasContainer = document.getElementById('listas-container');
const emptyState = document.getElementById('empty-state');
const btnBaixarNuvem = document.getElementById('btn-baixar-nuvem');
const btnConfig = document.getElementById('btn-config'); 

// ==========================================
// CONTROLE DE CATEGORIAS
// ==========================================
const categoriasConfig = [
  { id: 'mercado', nome: 'Mercado', icone: 'shopping_cart', cor: '#3b82f6' },
  { id: 'farmacia', nome: 'Farmácia', icone: 'medical_services', cor: '#ef4444' },
  { id: 'construcao', nome: 'Construção', icone: 'handyman', cor: '#f59e0b' },
  { id: 'outros', nome: 'Outros', icone: 'category', cor: '#64748b' }
];

let categoriaSelecionada = 'mercado';

// Lógica de selecionar a categoria no modal
document.querySelectorAll('.cat-option').forEach(el => {
  el.addEventListener('click', (e) => {
    // Remove a classe 'selected' de todos
    document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
    // Adiciona apenas no que foi clicado
    e.currentTarget.classList.add('selected');
    categoriaSelecionada = e.currentTarget.getAttribute('data-cat');
  });
});

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
    categoria: categoriaSelecionada, // 👈 Usa a categoria clicada!
    orcamento: orcamento,
    created_at: new Date().toISOString(),
    user_id: 'local' 
  };

  await db.listas.add(novaLista);
  modalLista.style.display = 'none';
  carregarListas();
});

// Carregar e exibir as listas
async function carregarListas() {
  const listas = await db.listas.toArray();
  listasContainer.innerHTML = ''; 

  if (listas.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  for (const lista of listas) {
    // CORREÇÃO 1: Garante que o orçamento será sempre um Número
    const orcamento = parseFloat(lista.orcamento) || 0;
    
    // CORREÇÃO 2: Garante que a data não quebre se vier vazia
    const dataFormatada = new Date(lista.created_at || new Date()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    const catDetalhes = categoriasConfig.find(c => c.id === lista.categoria) || categoriasConfig[3];
    
    const itensDaLista = await db.itens.where('lista_id').equals(lista.id).toArray();
    
    // CORREÇÃO 3: Garante que o preço unitário seja Número ao somar
    const gastoTotal = itensDaLista.reduce((acc, item) => acc + (item.quantidade * (parseFloat(item.preco_unitario) || 0)), 0);
    
    let porcentagem = orcamento > 0 ? (gastoTotal / orcamento) * 100 : 0;
    if (porcentagem > 100) porcentagem = 100;
    const corBarra = porcentagem > 90 ? 'var(--danger)' : catDetalhes.cor;

    const card = document.createElement('div');
    card.className = 'lista-card';
    card.innerHTML = `
      <div class="card-header" style="align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 0;">
        <div style="display: flex; align-items: center;">
          <div class="cat-icon-card" style="background-color: ${catDetalhes.cor};">
            <span class="material-symbols-rounded">${catDetalhes.icone}</span>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem;">${lista.nome}</h3>
            <span style="color: var(--text-muted); font-size: 0.8rem;">${dataFormatada}</span>
          </div>
        </div>
      </div>
      
      <div class="progress-container">
        <div class="progress-labels">
          <span>R$ ${gastoTotal.toFixed(2)}</span>
          <span>R$ ${orcamento.toFixed(2)}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-fill" style="width: ${porcentagem}%; background-color: ${corBarra};"></div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      window.location.href = `/lista.html?id=${lista.id}`;
    });

    listasContainer.appendChild(card);
  }
}

// ==========================================
// GERENCIAMENTO DE SESSÃO E LOGOUT
// ==========================================
async function verificarUsuario() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    btnConfig.innerHTML = `<span style="color: var(--danger); font-weight: bold;">Sair da Conta</span>`;
    btnBaixarNuvem.style.display = 'block'; 
    
    btnConfig.addEventListener('click', async () => {
      if(confirm('Tem certeza que deseja sair?')) {
        await supabase.auth.signOut();
        await db.listas.clear();
        await db.itens.clear();
        window.location.href = '/login.html';
      }
    });
  } else {
    btnConfig.innerHTML = `<span style="color: var(--primary-color); font-weight: bold;">Fazer Login</span>`;
    btnConfig.addEventListener('click', () => {
      window.location.href = '/login.html';
    });
  }
}

verificarUsuario();

// Função para baixar listas e itens do Supabase para o IndexedDB
btnBaixarNuvem.addEventListener('click', async () => {
  const icone = btnBaixarNuvem.querySelector('span');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Você precisa estar logado!');

    icone.style.animation = 'spin 1s linear infinite';
    const userId = session.user.id;

    const { data: listasNuvem, error: errorListas } = await supabase
      .from('listas')
      .select('*')
      .eq('user_id', userId);
      
    if (errorListas) throw errorListas;

    const { data: itensNuvem, error: errorItens } = await supabase
      .from('itens')
      .select('*')
      .eq('user_id', userId);

    if (errorItens) throw errorItens;

    await db.listas.clear();
    await db.itens.clear();

    if (listasNuvem && listasNuvem.length > 0) {
      await db.listas.bulkAdd(listasNuvem);
    }
    
    if (itensNuvem && itensNuvem.length > 0) {
      await db.itens.bulkAdd(itensNuvem);
    }

    carregarListas();
    alert('Listas atualizadas com sucesso! ☁️⬇️');

  } catch (error) {
    console.error('Erro ao baixar:', error);
    alert('Erro ao puxar dados da nuvem.');
  } finally {
    icone.style.animation = '';
  }
});

// Inicializa
carregarListas();