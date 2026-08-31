import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';
import { mostrarToast } from './utils.js';

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
const inputs = { nome: document.getElementById('input-nome-item'), qtd: document.getElementById('input-qtd-item'), preco: document.getElementById('input-preco-item') };

document.getElementById('btn-voltar-nav').addEventListener('click', () => window.location.href = '/');
document.getElementById('btn-voltar-ilha').addEventListener('click', () => window.location.href = '/');

async function carregarDados() {
  const lista = await db.listas.get(listaId);
  if (lista) nomeListaIlha.textContent = lista.nome;
  const itens = await db.itens.where('lista_id').equals(listaId).toArray();
  const total = itens.reduce((acc, item) => acc + (item.quantidade * (parseFloat(item.preco_unitario) || 0)), 0);
  totalListaIlha.textContent = `R$ ${total.toFixed(2)}`;

  itensContainer.innerHTML = '';
  if (itens.length === 0) { emptyState.style.display = 'block'; searchContainer.style.display = 'none'; return; }
  emptyState.style.display = 'none'; searchContainer.style.display = 'flex';
  renderizarItens(itens);
}

function renderizarItens(itensArray) {
  itensContainer.innerHTML = '';
  
  // Ordena os itens: Não comprados no topo, comprados no fim
  itensArray.sort((a, b) => (a.comprado === b.comprado) ? 0 : a.comprado ? 1 : -1);

  itensArray.forEach(item => {
    const preco = parseFloat(item.preco_unitario) || 0;
    const subtotal = item.quantidade * preco;
    const comprado = item.comprado;

    const card = document.createElement('div');
    card.className = 'item-card';
    if (comprado) card.style.opacity = '0.5';

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
        <button class="btn-check" data-id="${item.id}" style="background:none; border:none; color: ${comprado ? 'var(--success)' : 'var(--text-muted)'}; cursor:pointer; padding: 0;">
          <span class="material-symbols-rounded" style="font-size: 1.8rem;">${comprado ? 'check_circle' : 'radio_button_unchecked'}</span>
        </button>
        <div class="item-info">
          <h4 style="${comprado ? 'text-decoration: line-through;' : ''}">${item.nome}</h4>
          <span class="item-price">R$ ${preco.toFixed(2)} x ${item.quantidade}</span>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="item-subtotal" style="${comprado ? 'background-color: transparent; border-color: transparent;' : ''}">R$ ${subtotal.toFixed(2)}</div>
        <button class="btn-icon btn-excluir" data-id="${item.id}" style="color: var(--danger);"><span class="material-symbols-rounded">delete</span></button>
      </div>
    `;
    itensContainer.appendChild(card);
  });

  document.querySelectorAll('.btn-check').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = await db.itens.get(id);
      await db.itens.update(id, { comprado: !item.comprado });
      carregarDados();
    });
  });

  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Excluir este item?')) { await db.itens.delete(id); mostrarToast('Item removido', 'success'); carregarDados(); }
    });
  });
}

document.getElementById('btn-add-item').addEventListener('click', () => { inputs.nome.value = ''; inputs.qtd.value = 1; inputs.preco.value = ''; modalItem.style.display = 'flex'; });
document.getElementById('btn-fechar-modal-item').addEventListener('click', () => modalItem.style.display = 'none');

document.getElementById('btn-salvar-item').addEventListener('click', async () => {
  const nome = inputs.nome.value;
  if (!nome) return mostrarToast('Insira o nome do produto!', 'error');
  await db.itens.add({ id: generateUUID(), lista_id: listaId, nome, quantidade: parseInt(inputs.qtd.value) || 1, preco_unitario: parseFloat(inputs.preco.value) || 0, comprado: false, user_id: 'local' });
  modalItem.style.display = 'none';
  mostrarToast('Produto adicionado!', 'success');
  carregarDados();
});

inputBusca.addEventListener('input', async (e) => {
  const termo = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const todosItens = await db.itens.where('lista_id').equals(listaId).toArray();
  renderizarItens(todosItens.filter(item => item.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termo)));
});

// Compartilhar no WhatsApp
document.getElementById('btn-whatsapp').addEventListener('click', async () => {
  const lista = await db.listas.get(listaId);
  const itens = await db.itens.where('lista_id').equals(listaId).toArray();
  if (itens.length === 0) return mostrarToast('A lista está vazia!', 'error');

  let texto = `🛒 *Lista de Compras: ${lista.nome}*\n_Orçamento: R$ ${parseFloat(lista.orcamento).toFixed(2)}_\n\n`;
  let total = 0;
  
  itens.forEach(item => {
    const check = item.comprado ? '✅' : '➖';
    const subtotal = item.quantidade * (parseFloat(item.preco_unitario) || 0);
    total += subtotal;
    texto += `${check} ${item.quantidade}x ${item.nome} - R$ ${subtotal.toFixed(2)}\n`;
  });

  texto += `\n💰 *Total Estimado: R$ ${total.toFixed(2)}*\n\n_Gerado via Smart List_`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  mostrarToast('Abrindo WhatsApp...', 'info');
});

const btnSincronizar = document.getElementById('btn-sincronizar');
btnSincronizar.addEventListener('click', async () => {
  const iconeSync = btnSincronizar.querySelector('span');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return mostrarToast('Faça login para sincronizar!', 'error');

    iconeSync.style.animation = 'spin 1s linear infinite';
    const userId = session.user.id;
    const listaLocal = await db.listas.get(listaId);
    
    await supabase.from('listas').upsert({ ...listaLocal, orcamento: parseFloat(listaLocal.orcamento)||0, user_id: userId });
    const itensLocais = await db.itens.where('lista_id').equals(listaId).toArray();
    if (itensLocais.length > 0) {
      await supabase.from('itens').upsert(itensLocais.map(i => ({ ...i, preco_unitario: parseFloat(i.preco_unitario)||0, user_id: userId })));
    }
    mostrarToast('Sincronização concluída!', 'success');
  } catch (error) { mostrarToast('Erro ao sincronizar.', 'error'); } 
  finally { iconeSync.style.animation = ''; }
});

const modalCalculadora = document.getElementById('modal-calculadora');
const calcDisplay = document.getElementById('calc-display');
let expressaoCalc = '';

document.getElementById('btn-open-calc').addEventListener('click', () => modalCalculadora.style.display = 'flex');
document.getElementById('btn-close-calc').addEventListener('click', () => modalCalculadora.style.display = 'none');
modalCalculadora.addEventListener('click', (e) => { if (e.target === modalCalculadora) modalCalculadora.style.display = 'none'; });

document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    const val = e.target.getAttribute('data-val');
    if (action === 'number' || action === 'operator') {
      if (calcDisplay.textContent === '0' && action !== 'operator' && val !== '.') expressaoCalc = val;
      else expressaoCalc += val;
      calcDisplay.textContent = expressaoCalc;
    } else if (action === 'clear') { expressaoCalc = ''; calcDisplay.textContent = '0';
    } else if (action === 'delete') { expressaoCalc = expressaoCalc.toString().slice(0, -1); calcDisplay.textContent = expressaoCalc || '0';
    } else if (action === 'calculate') {
      try {
        const resultado = new Function('return ' + expressaoCalc)();
        if (!isFinite(resultado)) throw new Error();
        expressaoCalc = Number.isInteger(resultado) ? resultado.toString() : resultado.toFixed(2);
        calcDisplay.textContent = expressaoCalc;
      } catch (err) { calcDisplay.textContent = 'Erro'; expressaoCalc = ''; }
    }
  });
});

document.getElementById('btn-usar-valor').addEventListener('click', () => {
  const valorCalculado = parseFloat(calcDisplay.textContent);
  if (!isNaN(valorCalculado) && valorCalculado > 0) {
    modalCalculadora.style.display = 'none';
    inputs.nome.value = ''; inputs.qtd.value = 1; inputs.preco.value = valorCalculado.toFixed(2);
    modalItem.style.display = 'flex';
  } else { mostrarToast('Calcule um valor válido!', 'error'); }
});

carregarDados();