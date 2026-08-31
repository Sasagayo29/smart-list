import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';
import { mostrarToast } from './utils.js';
import * as XLSX from 'xlsx'; // 👈 Importação para ler Excel

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
const inputs = { nome: document.getElementById('input-nome-item'), qtd: document.getElementById('input-qtd-item'), preco: document.getElementById('input-preco-item') };

let itemEmEdicaoId = null; 

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
  itensArray.sort((a, b) => (a.comprado === b.comprado) ? 0 : a.comprado ? 1 : -1);

  itensArray.forEach(item => {
    const preco = parseFloat(item.preco_unitario) || 0;
    const subtotal = item.quantidade * preco;
    const comprado = item.comprado;

    const card = document.createElement('div');
    card.className = 'item-card';
    if (comprado) card.style.opacity = '0.5';

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
        <button class="btn-check" data-id="${item.id}" style="background:none; border:none; color: ${comprado ? 'var(--success)' : 'var(--text-muted)'}; cursor:pointer; padding: 0;">
          <span class="material-symbols-rounded" style="font-size: 1.8rem;">${comprado ? 'check_circle' : 'radio_button_unchecked'}</span>
        </button>
        <div class="item-info" style="flex: 1;">
          <h4 style="${comprado ? 'text-decoration: line-through;' : ''}">${item.nome}</h4>
          <span class="item-price">R$ ${preco.toFixed(2)} x ${item.quantidade}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 0.75rem;">
        <div class="item-subtotal" style="${comprado ? 'background-color: transparent; border-color: transparent;' : ''}">R$ ${subtotal.toFixed(2)}</div>
        <div class="item-actions-group">
          <button class="btn-action-pill edit btn-editar" data-id="${item.id}" title="Editar"><span class="material-symbols-rounded">edit</span></button>
          <button class="btn-action-pill delete btn-excluir" data-id="${item.id}" title="Excluir"><span class="material-symbols-rounded">delete</span></button>
        </div>
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

  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const item = await db.itens.get(e.currentTarget.getAttribute('data-id'));
      if (item) {
        itemEmEdicaoId = item.id; tituloModalItem.textContent = 'Editar Produto';
        inputs.nome.value = item.nome; inputs.qtd.value = item.quantidade; inputs.preco.value = parseFloat(item.preco_unitario).toFixed(2);
        modalItem.style.display = 'flex';
      }
    });
  });

  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Excluir este item?')) { await db.itens.delete(e.currentTarget.getAttribute('data-id')); mostrarToast('Removido', 'success'); carregarDados(); }
    });
  });
}

// 🎤 MÓDULO DE RECONHECIMENTO DE VOZ
const btnMic = document.getElementById('btn-mic');
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR'; // Português do Brasil
  recognition.continuous = false;

  btnMic.addEventListener('click', () => {
    mostrarToast('Ouvindo... Fale o nome do produto', 'info');
    btnMic.style.animation = 'spin 1s linear infinite'; // Dá um feedback visual
    recognition.start();
  });

  recognition.onresult = (event) => {
    const transcricao = event.results[0][0].transcript;
    // Prepara o modal de adição com o nome falado!
    itemEmEdicaoId = null;
    tituloModalItem.textContent = 'Adicionar (Por Voz)';
    inputs.nome.value = transcricao.charAt(0).toUpperCase() + transcricao.slice(1);
    inputs.qtd.value = 1;
    inputs.preco.value = '';
    modalItem.style.display = 'flex';
    mostrarToast('Produto reconhecido!', 'success');
  };
  
  recognition.onerror = () => { mostrarToast('Não entendi. Tente novamente.', 'error'); };
  recognition.onend = () => { btnMic.style.animation = ''; };
} else {
  btnMic.style.display = 'none'; // Esconde se o navegador não suportar (ex: Firefox antigo)
}

// 📁 MÓDULO DE IMPORTAÇÃO (Excel/TXT para DENTRO da lista)
const inputImportar = document.getElementById('input-importar');
inputImportar.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const extensao = file.name.split('.').pop().toLowerCase();

  try {
    if (extensao === 'txt' || extensao === 'csv') {
      const texto = await file.text();
      for (const linha of texto.split('\n')) {
        if (linha.trim() === '') continue;
        const partes = linha.split(',');
        await db.itens.add({ id: generateUUID(), lista_id: listaId, nome: partes[0].trim(), quantidade: parseInt(partes[1]) || 1, preco_unitario: parseFloat(partes[2]) || 0, comprado: false, user_id: 'local' });
      }
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const dados = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      for (const linha of dados) {
        const nome = linha.Nome || linha.nome || linha.Produto || linha.produto;
        if (!nome) continue; 
        await db.itens.add({ id: generateUUID(), lista_id: listaId, nome: String(nome), quantidade: parseInt(linha.Qtd || linha.Quantidade || 1), preco_unitario: parseFloat(linha.Preco || linha.Valor || 0), comprado: false, user_id: 'local' });
      }
    }
    mostrarToast('Itens mesclados com sucesso!', 'success');
    carregarDados();
  } catch (error) { mostrarToast('Erro ao importar arquivo', 'error'); }
  e.target.value = ''; // Limpa o input
});

document.getElementById('btn-add-item').addEventListener('click', () => { 
  itemEmEdicaoId = null; tituloModalItem.textContent = 'Adicionar Produto';
  inputs.nome.value = ''; inputs.qtd.value = 1; inputs.preco.value = ''; modalItem.style.display = 'flex'; 
});
document.getElementById('btn-fechar-modal-item').addEventListener('click', () => modalItem.style.display = 'none');

document.getElementById('btn-salvar-item').addEventListener('click', async () => {
  const nome = inputs.nome.value;
  if (!nome) return mostrarToast('Insira o nome!', 'error');
  if (itemEmEdicaoId) await db.itens.update(itemEmEdicaoId, { nome, quantidade: parseInt(inputs.qtd.value)||1, preco_unitario: parseFloat(inputs.preco.value)||0 });
  else await db.itens.add({ id: generateUUID(), lista_id: listaId, nome, quantidade: parseInt(inputs.qtd.value)||1, preco_unitario: parseFloat(inputs.preco.value)||0, comprado: false, user_id: 'local' });
  modalItem.style.display = 'none'; itemEmEdicaoId = null; carregarDados();
});

inputBusca.addEventListener('input', async (e) => {
  const termo = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const todosItens = await db.itens.where('lista_id').equals(listaId).toArray();
  renderizarItens(todosItens.filter(item => item.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termo)));
});

// Compartilhar Nativo
document.getElementById('btn-share').addEventListener('click', async () => {
  const lista = await db.listas.get(listaId);
  const itens = await db.itens.where('lista_id').equals(listaId).toArray();
  if (itens.length === 0) return mostrarToast('Lista vazia!', 'error');

  let texto = `🛒 *${lista.nome}*\n_Orçamento: R$ ${parseFloat(lista.orcamento).toFixed(2)}_\n\n`;
  let total = 0;
  itens.forEach(item => { total += item.quantidade * (parseFloat(item.preco_unitario)||0); texto += `${item.comprado?'✅':'➖'} ${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * (parseFloat(item.preco_unitario)||0)).toFixed(2)}\n`; });
  texto += `\n💰 *Total Estimado: R$ ${total.toFixed(2)}*\n\n_Gerado via Smart List_`;

  if (navigator.share) {
    try { await navigator.share({ title: `Smart List - ${lista.nome}`, text: texto }); } 
    catch (err) { console.log('Cancelado'); }
  } else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank'); }
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
    if (itensLocais.length > 0) await supabase.from('itens').upsert(itensLocais.map(i => ({ ...i, preco_unitario: parseFloat(i.preco_unitario)||0, user_id: userId })));
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
    modalCalculadora.style.display = 'none';
    tituloModalItem.textContent = itemEmEdicaoId ? 'Editar Produto' : 'Adicionar Produto';
    if (!itemEmEdicaoId) inputs.nome.value = ''; inputs.qtd.value = 1; inputs.preco.value = valorCalculado.toFixed(2);
    modalItem.style.display = 'flex';
  } else { mostrarToast('Calcule um valor válido!', 'error'); }
});

carregarDados();