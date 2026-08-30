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
    categoria: 'mercado', 
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

  listas.forEach(lista => {
    const dataFormatada = new Date(lista.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
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

    card.addEventListener('click', () => {
      window.location.href = `/lista.html?id=${lista.id}`;
    });

    listasContainer.appendChild(card);
  });
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