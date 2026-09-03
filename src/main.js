import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';
import { mostrarToast } from './utils.js';
import * as XLSX from 'xlsx'; 

const btnNovaLista = document.getElementById('btn-nova-lista');
const modalLista = document.getElementById('modal-lista');
const tituloModalLista = modalLista.querySelector('h3');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnSalvarLista = document.getElementById('btn-salvar-lista');
const listasContainer = document.getElementById('listas-container');
const emptyState = document.getElementById('empty-state');
const btnBaixarNuvem = document.getElementById('btn-baixar-nuvem');

let listaEmEdicaoId = null; 

const categoriasConfig = [
  { id: 'mercado', nome: 'Mercado', icone: 'shopping_cart', cor: '#3b82f6' },
  { id: 'farmacia', nome: 'Farmácia', icone: 'medical_services', cor: '#ef4444' },
  { id: 'construcao', nome: 'Construção', icone: 'handyman', cor: '#f59e0b' },
  { id: 'outros', nome: 'Outros', icone: 'category', cor: '#64748b' }
];

let categoriaSelecionada = 'mercado';

document.querySelectorAll('.cat-option').forEach(el => {
  el.addEventListener('click', (e) => {
    document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
    e.currentTarget.classList.add('selected');
    categoriaSelecionada = e.currentTarget.getAttribute('data-cat');
  });
});

// ==========================================
// ABRIR MODAIS E SALVAR
// ==========================================
btnNovaLista.addEventListener('click', () => {
  listaEmEdicaoId = null;
  tituloModalLista.textContent = 'Criar Nova Lista';
  document.getElementById('input-nome-lista').value = '';
  document.getElementById('input-orcamento-lista').value = '';
  
  document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
  document.querySelector('.cat-option[data-cat="mercado"]').classList.add('selected');
  categoriaSelecionada = 'mercado';
  
  modalLista.style.display = 'flex';
});

btnFecharModal.addEventListener('click', () => {
  modalLista.style.display = 'none';
  listaEmEdicaoId = null;
});

btnSalvarLista.addEventListener('click', async () => {
  const nome = document.getElementById('input-nome-lista').value;
  const orcamento = parseFloat(document.getElementById('input-orcamento-lista').value) || 0;
  if (!nome) return mostrarToast('Dê um nome para a sua lista!', 'error');

  if (listaEmEdicaoId) {
    await db.listas.update(listaEmEdicaoId, { nome, orcamento, categoria: categoriaSelecionada });
    mostrarToast('Lista atualizada com sucesso!', 'success');
  } else {
    await db.listas.add({ id: generateUUID(), nome, categoria: categoriaSelecionada, orcamento, created_at: new Date().toISOString(), user_id: 'local' });
    mostrarToast('Lista criada com sucesso!', 'success');
  }

  modalLista.style.display = 'none';
  listaEmEdicaoId = null;
  carregarListas();
});

let meuGrafico = null;
function renderizarGrafico(labels, orcamentos, gastos) {
  const ctx = document.getElementById('grafico-gastos');
  const section = document.getElementById('chart-section');
  if (!ctx || labels.length === 0) { section.style.display = 'none'; return; }
  
  section.style.display = 'block';
  if (meuGrafico) meuGrafico.destroy();

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = 'Inter';

  meuGrafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Orçamento (R$)', data: orcamentos, backgroundColor: '#334155', borderRadius: 4 },
        { label: 'Gasto Real (R$)', data: gastos, backgroundColor: '#0ea5e9', borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#1e293b' } }, x: { grid: { display: false } } } }
  });
}

// ==========================================
// RENDERIZAÇÃO DAS LISTAS (DESTAQUE + ARQUIVADAS)
// ==========================================
async function carregarListas() {
  const listas = await db.listas.toArray();
  const secaoDestaque = document.getElementById('secao-destaque');
  const listaDestaqueContainer = document.getElementById('lista-destaque-container');
  const secaoArquivadas = document.getElementById('secao-arquivadas');
  const listasArquivadasContainer = document.getElementById('listas-arquivadas-container');
  const qtdArquivadasSpan = document.getElementById('qtd-arquivadas');

  listaDestaqueContainer.innerHTML = '';
  listasArquivadasContainer.innerHTML = '';

  if (listas.length === 0) {
    emptyState.style.display = 'block';
    secaoDestaque.style.display = 'none';
    secaoArquivadas.style.display = 'none';
    renderizarGrafico([], [], []);
    return;
  }

  emptyState.style.display = 'none';
  const labels = []; const orcs = []; const gasts = [];

  listas.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const [listaRecente, ...listasPassadas] = listas;

  async function criarCardLista(lista, isDestaque = false) {
    const orcamento = parseFloat(lista.orcamento) || 0;
    const dataFormatada = new Date(lista.created_at || new Date()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const catDetalhes = categoriasConfig.find(c => c.id === lista.categoria) || categoriasConfig[3];
    const itensDaLista = await db.itens.where('lista_id').equals(lista.id).toArray();
    const gastoTotal = itensDaLista.reduce((acc, item) => acc + (item.quantidade * (parseFloat(item.preco_unitario) || 0)), 0);

    labels.push(lista.nome);
    orcs.push(orcamento);
    gasts.push(gastoTotal);

    let porcentagem = orcamento > 0 ? (gastoTotal / orcamento) * 100 : 0;
    if (porcentagem > 100) porcentagem = 100;
    const corBarra = porcentagem > 90 ? 'var(--danger)' : catDetalhes.cor;

    const card = document.createElement('div');
    card.className = `lista-card ${isDestaque ? 'card-destaque' : ''}`;
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;">
        <div class="cat-icon-card" style="background-color: ${catDetalhes.cor}; margin: 0; flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px;">
          <span class="material-symbols-rounded" style="font-size: 1.8rem;">${catDetalhes.icone}</span>
        </div>
        <div style="overflow: hidden; flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main);">${lista.nome}</h3>
            ${isDestaque ? '<span style="background: rgba(14, 165, 233, 0.2); color: var(--primary-color); font-size: 0.7rem; padding: 2px 8px; border-radius: 99px; font-weight: 700;">ATUAL</span>' : ''}
          </div>
          <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 500;">${dataFormatada}</span>
        </div>
      </div>

      <div class="progress-container" style="margin-top: 0; margin-bottom: 1.25rem;">
        <div class="progress-labels">
          <span style="font-weight: 700; color: var(--text-main);">R$ ${gastoTotal.toFixed(2)}</span>
          <span>R$ ${orcamento.toFixed(2)}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-fill" style="width: ${porcentagem}%; background-color: ${corBarra};"></div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
         <button class="btn-icon btn-editar-lista" data-id="${lista.id}" style="color: var(--primary-color); width: 38px; height: 38px;" title="Editar">
           <span class="material-symbols-rounded" style="font-size: 1.3rem;">edit</span>
         </button>
         <button class="btn-icon btn-clonar" data-id="${lista.id}" style="color: var(--text-muted); width: 38px; height: 38px;" title="Duplicar">
           <span class="material-symbols-rounded" style="font-size: 1.3rem;">content_copy</span>
         </button>
         <button class="btn-icon btn-excluir-lista" data-id="${lista.id}" style="color: var(--danger); width: 38px; height: 38px;" title="Excluir">
           <span class="material-symbols-rounded" style="font-size: 1.3rem;">delete</span>
         </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if(!e.target.closest('.btn-clonar') && !e.target.closest('.btn-excluir-lista') && !e.target.closest('.btn-editar-lista')) {
        window.location.href = `/lista.html?id=${lista.id}`;
      }
    });

    return card;
  }

  if (listaRecente) {
    const cardRecente = await criarCardLista(listaRecente, true);
    listaDestaqueContainer.appendChild(cardRecente);
    secaoDestaque.style.display = 'block';
  }

  if (listasPassadas.length > 0) {
    qtdArquivadasSpan.textContent = listasPassadas.length;
    for (const l of listasPassadas) {
      const cardArquivada = await criarCardLista(l, false);
      listasArquivadasContainer.appendChild(cardArquivada);
    }
    secaoArquivadas.style.display = 'block';
  } else {
    secaoArquivadas.style.display = 'none';
  }

  vincularAcoesListas();
  renderizarGrafico(labels.slice(0, 5), orcs.slice(0, 5), gasts.slice(0, 5));
}

// ----------------------------------------------------
// BOTÕES DE AÇÃO DOS CARDS (EDITAR, CLONAR, EXCLUIR)
// ----------------------------------------------------
function vincularAcoesListas() {
  document.querySelectorAll('.btn-editar-lista').forEach(btn => {
    btn.addEventListener('click', async (e) => {
       e.stopPropagation();
       const id = e.currentTarget.getAttribute('data-id');
       const lista = await db.listas.get(id);
       if (lista) {
         listaEmEdicaoId = lista.id;
         tituloModalLista.textContent = 'Editar Lista';
         document.getElementById('input-nome-lista').value = lista.nome;
         document.getElementById('input-orcamento-lista').value = parseFloat(lista.orcamento).toFixed(2);
         document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
         const catOption = document.querySelector(`.cat-option[data-cat="${lista.categoria}"]`);
         if(catOption) catOption.classList.add('selected');
         categoriaSelecionada = lista.categoria;
         modalLista.style.display = 'flex';
       }
    });
  });

  // Exclusão com Inteligência da Nuvem Garantida
  document.querySelectorAll('.btn-excluir-lista').forEach(btn => {
    btn.addEventListener('click', async (e) => {
       e.stopPropagation();
       if(confirm('Excluir esta lista e todos os seus produtos?')) {
          const id = e.currentTarget.getAttribute('data-id');
          await db.itens.where('lista_id').equals(id).delete();
          await db.listas.delete(id);
          try {
             const { data: { session } } = await supabase.auth.getSession();
             if (session) {
                await supabase.from('itens').delete().eq('lista_id', id);
                await supabase.from('listas').delete().eq('id', id);
             }
          } catch (err) { console.log('Apagado apenas localmente.'); }
          mostrarToast('Lista excluída!', 'success');
          carregarListas();
       }
    });
  });

  document.querySelectorAll('.btn-clonar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
       e.stopPropagation();
       const id = e.currentTarget.getAttribute('data-id');
       const listaAntiga = await db.listas.get(id);
       const itensAntigos = await db.itens.where('lista_id').equals(id).toArray();
       const novaListaId = generateUUID();
       
       await db.listas.add({ ...listaAntiga, id: novaListaId, nome: listaAntiga.nome + ' (Cópia)', created_at: new Date().toISOString() });
       for(const item of itensAntigos) {
          await db.itens.add({ ...item, id: generateUUID(), lista_id: novaListaId, comprado: false });
       }
       mostrarToast('Lista duplicada!', 'success');
       carregarListas();
    });
  });
}

// 📂 Alternador da Pasta / Gaveta de Arquivadas
const btnToggleArquivadas = document.getElementById('btn-toggle-arquivadas');
const gavetaArquivadas = document.getElementById('listas-arquivadas-container');
const iconePastaSeta = document.getElementById('icone-pasta-seta');

if (btnToggleArquivadas) {
  btnToggleArquivadas.addEventListener('click', () => {
    const fechado = gavetaArquivadas.style.display === 'none';
    gavetaArquivadas.style.display = fechado ? 'grid' : 'none';
    iconePastaSeta.style.transform = fechado ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}

// ==========================================
// AUTENTICAÇÃO E IMPORTAÇÃO
// ==========================================
async function verificarUsuario() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    btnBaixarNuvem.style.display = 'flex'; 
  }
}
verificarUsuario();

const inputImportDashboard = document.getElementById('input-import-dashboard');
if (inputImportDashboard) {
  inputImportDashboard.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extensao = file.name.split('.').pop().toLowerCase();
    const nomeLista = file.name.replace(/\.[^/.]+$/, ""); 
    const novaListaId = generateUUID();

    try {
      await db.listas.add({ id: novaListaId, nome: `Importada: ${nomeLista}`, categoria: 'outros', orcamento: 0, created_at: new Date().toISOString(), user_id: 'local' });

      if (extensao === 'txt' || extensao === 'csv') {
        const texto = await file.text();
        for (const linha of texto.split('\n')) {
          if (linha.trim() === '') continue;
          const partes = linha.split(',');
          await db.itens.add({ id: generateUUID(), lista_id: novaListaId, nome: partes[0].trim(), quantidade: parseInt(partes[1]) || 1, preco_unitario: parseFloat(partes[2]) || 0, comprado: false, user_id: 'local' });
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const dados = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        for (const linha of dados) {
          const nome = linha.Nome || linha.nome || linha.Produto || linha.produto;
          if (!nome) continue; 
          await db.itens.add({ id: generateUUID(), lista_id: novaListaId, nome: String(nome), quantidade: parseInt(linha.Qtd || linha.Quantidade || 1), preco_unitario: parseFloat(linha.Preco || linha.Valor || 0), comprado: false, user_id: 'local' });
        }
      }
      mostrarToast('Lista importada com sucesso!', 'success');
      carregarListas();
    } catch (error) {
      mostrarToast('Erro ao importar arquivo', 'error');
    }
    e.target.value = ''; 
  });
}

// Lógica de Sincronização Global
btnBaixarNuvem.addEventListener('click', async () => {
  const icone = btnBaixarNuvem.querySelector('span');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.href = '/login.html'; 

    icone.style.animation = 'spin 1s linear infinite';
    const userId = session.user.id;
    const listasLocais = await db.listas.toArray();
    const itensLocais = await db.itens.toArray();

    if (listasLocais.length > 0) await supabase.from('listas').upsert(listasLocais.map(l => ({ ...l, orcamento: parseFloat(l.orcamento)||0, user_id: userId })));
    if (itensLocais.length > 0) await supabase.from('itens').upsert(itensLocais.map(i => ({ ...i, preco_unitario: parseFloat(i.preco_unitario)||0, user_id: userId })));

    const [{ data: listasNuvem }, { data: itensNuvem }] = await Promise.all([
      supabase.from('listas').select('*').eq('user_id', userId),
      supabase.from('itens').select('*').eq('user_id', userId)
    ]);

    await db.listas.clear(); await db.itens.clear();
    if (listasNuvem?.length) await db.listas.bulkAdd(listasNuvem);
    if (itensNuvem?.length) await db.itens.bulkAdd(itensNuvem);

    carregarListas();
    mostrarToast('Sincronização completa!', 'success');
  } catch (error) { mostrarToast('Erro ao comunicar com a nuvem.', 'error'); } 
  finally { icone.style.animation = ''; }
});

carregarListas();