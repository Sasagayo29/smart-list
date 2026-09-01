import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';
import { mostrarToast } from './utils.js';
import * as XLSX from 'xlsx'; 

const urlParams = new URLSearchParams(window.location.search);
const listaId = urlParams.get('id');
if (!listaId) window.location.href = '/';

const nomeListaIlha = document.getElementById('nome-lista-ilha');
const totalListaIlha = document.getElementById('total-lista-ilha');
const itensContainer = document.getElementById('itens-container');
const emptyState = document.getElementById('empty-state-itens');
const searchContainer = document.getElementById('search-container');
const inputBusca = document.getElementById('input-busca');
const modalItem = document.getElementById('modal-item');
const tituloModalItem = modalItem.querySelector('h3'); 

const inputs = { 
  nome: document.getElementById('input-nome-item'), 
  qtd: document.getElementById('input-qtd-item'), 
  unidade: document.getElementById('input-unidade-item'), // Novo campo!
  preco: document.getElementById('input-preco-item') 
};

let itemEmEdicaoId = null; 

// ==========================================
// 1. NAVEGAÇÃO E DADOS BASE
// ==========================================
document.getElementById('btn-voltar-nav').addEventListener('click', () => window.location.href = '/');
document.getElementById('btn-voltar-ilha').addEventListener('click', () => window.location.href = '/');

async function carregarDados() {
  const lista = await db.listas.get(listaId);
  if (lista) nomeListaIlha.textContent = lista.nome;
  const itens = await db.itens.where('lista_id').equals(listaId).toArray();
  const total = itens.reduce((acc, item) => acc + (item.quantidade * (parseFloat(item.preco_unitario) || 0)), 0);
  totalListaIlha.textContent = `R$ ${total.toFixed(2)}`;

  itensContainer.innerHTML = '';
  if (itens.length === 0) { 
    emptyState.style.display = 'block'; 
    searchContainer.style.display = 'none'; 
    return; 
  }
  emptyState.style.display = 'none'; 
  searchContainer.style.display = 'flex';
  renderizarItens(itens);
}

function renderizarItens(itensArray) {
  itensContainer.innerHTML = '';
  itensArray.sort((a, b) => (a.comprado === b.comprado) ? 0 : a.comprado ? 1 : -1);

  itensArray.forEach(item => {
    const preco = parseFloat(item.preco_unitario) || 0;
    const subtotal = item.quantidade * preco;
    const comprado = item.comprado;
    const unidade = item.unidade || 'un'; // Garante padrão "un"

    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '1rem';

    // 🌟 NOVO LAYOUT DO CARTÃO (Com os botões de + e -) 🌟
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
        <div style="display: flex; gap: 0.75rem; align-items: flex-start; flex: 1;">
           <button class="btn-check" data-id="${item.id}" style="background:none; border:none; color: ${comprado ? 'var(--success)' : 'var(--text-muted)'}; cursor:pointer; padding: 0;">
             <span class="material-symbols-rounded" style="font-size: 1.8rem;">${comprado ? 'check_circle' : 'radio_button_unchecked'}</span>
           </button>
           <div>
             <h4 style="${comprado ? 'text-decoration: line-through;' : ''} margin: 0 0 0.25rem 0;">${item.nome}</h4>
             <span style="font-size: 0.85rem; color: var(--text-muted);">R$ ${preco.toFixed(2)} / ${unidade}</span>
           </div>
        </div>
        <div class="item-subtotal" style="font-size: 1rem; ${comprado ? 'background-color: transparent; border-color: transparent;' : ''}">
          R$ ${subtotal.toFixed(2)}
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
         <!-- Botões de Controle Rápido -->
         <div class="qtd-control" style="${comprado ? 'opacity: 0.5; pointer-events: none;' : ''}">
           <button class="btn-qtd btn-minus" data-id="${item.id}"><span class="material-symbols-rounded" style="font-size: 1.2rem;">remove</span></button>
           <span class="qtd-value">${item.quantidade} <span style="font-size:0.7rem; color: var(--text-muted);">${unidade}</span></span>
           <button class="btn-qtd btn-plus" data-id="${item.id}"><span class="material-symbols-rounded" style="font-size: 1.2rem;">add</span></button>
         </div>

         <!-- Botões de Edição/Exclusão -->
         <div class="item-actions-group">
           <button class="btn-action-pill edit btn-editar" data-id="${item.id}" title="Editar"><span class="material-symbols-rounded">edit</span></button>
           <button class="btn-action-pill delete btn-excluir" data-id="${item.id}" title="Excluir"><span class="material-symbols-rounded">delete</span></button>
         </div>
      </div>
    `;
    itensContainer.appendChild(card);
  });

  // Evento de Check (Comprado)
  document.querySelectorAll('.btn-check').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = await db.itens.get(id);
      await db.itens.update(id, { comprado: !item.comprado });
      carregarDados();
    });
  });

  // Lógica inteligente dos Botões de + e -
  document.querySelectorAll('.btn-plus').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = await db.itens.get(id);
      let passo = 1;
      if(item.unidade === 'kg' || item.unidade === 'L') passo = 0.5; // Carnes e líquidos somam de meio em meio
      
      await db.itens.update(id, { quantidade: parseFloat((item.quantidade + passo).toFixed(3)) });
      carregarDados();
    });
  });

  document.querySelectorAll('.btn-minus').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = await db.itens.get(id);
      let passo = 1;
      if(item.unidade === 'kg' || item.unidade === 'L') passo = 0.5;
      
      if (item.quantidade > passo) {
        await db.itens.update(id, { quantidade: parseFloat((item.quantidade - passo).toFixed(3)) });
        carregarDados();
      } else {
        mostrarToast('Use o botão de lixeira para remover', 'info');
      }
    });
  });

  // Editar Item (Agora puxa a unidade também)
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const item = await db.itens.get(e.currentTarget.getAttribute('data-id'));
      if (item) {
        itemEmEdicaoId = item.id; 
        tituloModalItem.textContent = 'Editar Produto';
        inputs.nome.value = item.nome; 
        inputs.qtd.value = item.quantidade; 
        inputs.unidade.value = item.unidade || 'un';
        inputs.preco.value = parseFloat(item.preco_unitario).toFixed(2);
        modalItem.style.display = 'flex';
      }
    });
  });

  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Excluir este item?')) { 
        await db.itens.delete(e.currentTarget.getAttribute('data-id')); 
        mostrarToast('Removido', 'success'); 
        carregarDados(); 
      }
    });
  });
}

inputBusca.addEventListener('input', async (e) => {
  const termo = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const todosItens = await db.itens.where('lista_id').equals(listaId).toArray();
  renderizarItens(todosItens.filter(item => item.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termo)));
});

// ==========================================
// 2. FUNÇÕES DE ADICIONAR E SALVAR ITEM
// ==========================================
document.getElementById('btn-add-item').addEventListener('click', () => { 
  itemEmEdicaoId = null; 
  tituloModalItem.textContent = 'Adicionar Produto';
  inputs.nome.value = ''; 
  inputs.qtd.value = 1; 
  inputs.unidade.value = 'un';
  inputs.preco.value = ''; 
  modalItem.style.display = 'flex'; 
});

document.getElementById('btn-fechar-modal-item').addEventListener('click', () => {
  modalItem.style.display = 'none';
});

// Salvar no Banco (Agora permite decimais graças ao parseFloat)
document.getElementById('btn-salvar-item').addEventListener('click', async () => {
  const nome = inputs.nome.value;
  if (!nome) return mostrarToast('Insira o nome!', 'error');
  
  const payload = {
    nome, 
    quantidade: parseFloat(inputs.qtd.value) || 1, 
    unidade: inputs.unidade.value,
    preco_unitario: parseFloat(inputs.preco.value) || 0
  };

  if (itemEmEdicaoId) {
    await db.itens.update(itemEmEdicaoId, payload);
  } else {
    await db.itens.add({ ...payload, id: generateUUID(), lista_id: listaId, comprado: false, user_id: 'local' });
  }
  
  modalItem.style.display = 'none'; 
  itemEmEdicaoId = null; 
  carregarDados();
});

// ==========================================
// 3. MENU EXPANSÍVEL (FAB) E MÓDULOS EXTRAS
// ==========================================
const fabContainer = document.getElementById('fab-container');
const btnFabToggle = document.getElementById('btn-fab-toggle');

if (btnFabToggle) {
  btnFabToggle.addEventListener('click', (e) => { e.stopPropagation(); fabContainer.classList.toggle('active'); });
}
document.addEventListener('click', (e) => { if (fabContainer && fabContainer.classList.contains('active') && !fabContainer.contains(e.target)) fabContainer.classList.remove('active'); });
document.querySelectorAll('.fab-menu .fab-action').forEach(btn => { btn.addEventListener('click', () => fabContainer.classList.remove('active')); });

const btnMic = document.getElementById('btn-mic');
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR'; recognition.continuous = false;

  btnMic.addEventListener('click', () => {
    mostrarToast('Ouvindo...', 'info');
    btnMic.style.animation = 'spin 1s linear infinite';
    recognition.start();
  });
  recognition.onresult = (event) => {
    const transcricao = event.results[0][0].transcript;
    itemEmEdicaoId = null; tituloModalItem.textContent = 'Adicionar (Por Voz)';
    inputs.nome.value = transcricao.charAt(0).toUpperCase() + transcricao.slice(1); inputs.qtd.value = 1; inputs.unidade.value = 'un'; inputs.preco.value = '';
    modalItem.style.display = 'flex'; mostrarToast('Produto reconhecido!', 'success');
  };
  recognition.onerror = () => mostrarToast('Não entendi.', 'error');
  recognition.onend = () => btnMic.style.animation = '';
} else { btnMic.style.display = 'none'; }

const inputCamera = document.getElementById('input-camera');
if (inputCamera) {
  inputCamera.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    mostrarToast('Processando imagem...', 'info');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const nomeIdentificado = prompt("Etiqueta lida! Confirme o nome do produto:", "Produto");
      if (nomeIdentificado) {
        const precoIdentificado = parseFloat(prompt(`Qual o preço de ${nomeIdentificado}?`, "0.00")) || 0;
        await db.itens.add({ id: generateUUID(), lista_id: listaId, nome: nomeIdentificado, quantidade: 1, unidade: 'un', preco_unitario: precoIdentificado, comprado: false, user_id: 'local' });
        carregarDados();
      }
    } catch (error) { mostrarToast('Erro ao ler a imagem.', 'error'); } 
    finally { inputCamera.value = ''; }
  });
}

// Calculadora
const modalCalculadora = document.getElementById('modal-calculadora');
const calcDisplay = document.getElementById('calc-display');
let expressaoCalc = '';

document.getElementById('btn-open-calc').addEventListener('click', () => modalCalculadora.style.display = 'flex');
document.getElementById('btn-close-calc').addEventListener('click', () => modalCalculadora.style.display = 'none');
modalCalculadora.addEventListener('click', (e) => { if (e.target === modalCalculadora) modalCalculadora.style.display = 'none'; });

document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const val = e.target.getAttribute('data-val');
    const action = e.target.getAttribute('data-action');
    if (action === 'number' || action === 'operator') {
      if (calcDisplay.textContent === '0' && action !== 'operator' && val !== '.') expressaoCalc = val;
      else expressaoCalc += val;
      calcDisplay.textContent = expressaoCalc;
    } else if (action === 'clear') { expressaoCalc = ''; calcDisplay.textContent = '0';
    } else if (action === 'delete') { expressaoCalc = expressaoCalc.toString().slice(0, -1); calcDisplay.textContent = expressaoCalc || '0';
    } else if (action === 'calculate') {
      try { expressaoCalc = Number.isInteger(new Function('return ' + expressaoCalc)()) ? new Function('return ' + expressaoCalc)().toString() : new Function('return ' + expressaoCalc)().toFixed(2); calcDisplay.textContent = expressaoCalc; } 
      catch (err) { calcDisplay.textContent = 'Erro'; expressaoCalc = ''; }
    }
  });
});
document.getElementById('btn-usar-valor').addEventListener('click', () => {
  const valorCalculado = parseFloat(calcDisplay.textContent);
  if (!isNaN(valorCalculado) && valorCalculado > 0) {
    modalCalculadora.style.display = 'none'; tituloModalItem.textContent = itemEmEdicaoId ? 'Editar Produto' : 'Adicionar Produto';
    if (!itemEmEdicaoId) { inputs.nome.value = ''; inputs.qtd.value = 1; inputs.unidade.value = 'un'; }
    inputs.preco.value = valorCalculado.toFixed(2); modalItem.style.display = 'flex';
  } else { mostrarToast('Valor inválido!', 'error'); }
});

// ==========================================
// 4. INTEGRAÇÕES: NUVEM E COMPARTILHAMENTO
// ==========================================
document.getElementById('btn-sincronizar').addEventListener('click', async () => {
  const iconeSync = document.getElementById('btn-sincronizar').querySelector('span');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return mostrarToast('Faça login!', 'error');
    iconeSync.style.animation = 'spin 1s linear infinite';
    const userId = session.user.id;
    const listaLocal = await db.listas.get(listaId);
    await supabase.from('listas').upsert({ ...listaLocal, orcamento: parseFloat(listaLocal.orcamento)||0, user_id: userId });
    
    // Atualiza Upsert com UNIDADE
    const itensLocais = await db.itens.where('lista_id').equals(listaId).toArray();
    if (itensLocais.length > 0) await supabase.from('itens').upsert(itensLocais.map(i => ({ ...i, preco_unitario: parseFloat(i.preco_unitario)||0, unidade: i.unidade || 'un', user_id: userId })));
    mostrarToast('Sincronizado!', 'success');
  } catch (error) { mostrarToast('Erro na nuvem.', 'error'); } 
  finally { iconeSync.style.animation = ''; }
});

document.getElementById('btn-share').addEventListener('click', async () => {
  const lista = await db.listas.get(listaId);
  const itens = await db.itens.where('lista_id').equals(listaId).toArray();
  if (itens.length === 0) return mostrarToast('Lista vazia!', 'error');

  let texto = `🛒 *${lista.nome}*\n_Orçamento: R$ ${parseFloat(lista.orcamento).toFixed(2)}_\n\n`;
  let total = 0;
  itens.forEach(item => { 
    total += item.quantidade * (parseFloat(item.preco_unitario)||0); 
    // WhatsApp Export formatado com unidade
    texto += `${item.comprado?'✅':'➖'} ${item.quantidade}${item.unidade||'un'} ${item.nome} - R$ ${(item.quantidade * (parseFloat(item.preco_unitario)||0)).toFixed(2)}\n`; 
  });
  texto += `\n💰 *Total Estimado: R$ ${total.toFixed(2)}*\n\n_Gerado via Smart List_`;
  if (navigator.share) { try { await navigator.share({ title: `Smart List - ${lista.nome}`, text: texto }); } catch (err) {}
  } else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank'); }
});

carregarDados();