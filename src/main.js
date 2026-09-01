import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';
import { mostrarToast } from './utils.js';
import * as XLSX from 'xlsx'; 

const btnNovaLista = document.getElementById('btn-nova-lista');
const modalLista = document.getElementById('modal-lista');
const tituloModalLista = modalLista.querySelector('h3'); // Seleciona o título do modal
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnSalvarLista = document.getElementById('btn-salvar-lista');
const listasContainer = document.getElementById('listas-container');
const emptyState = document.getElementById('empty-state');
const btnBaixarNuvem = document.getElementById('btn-baixar-nuvem');

let listaEmEdicaoId = null; // Variável de controle (Criar vs Editar)

const categoriasConfig = [
  { id: 'mercado', nome: 'Mercado', icone: 'shopping_cart', cor: '#3b82f6' },
  { id: 'farmacia', nome: 'Farmácia', icone: 'medical_services', cor: '#ef4444' },
  { id: 'construcao', nome: 'Construção', icone: 'handyman', cor: '#f59e0b' },
  { id: 'outros', nome: 'Outros', icone: 'category', cor: '#64748b' }
];

let categoriaSelecionada = 'mercado';

// Lógica de seleção de categorias no modal
document.querySelectorAll('.cat-option').forEach(el => {
  el.addEventListener('click', (e) => {
    document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
    e.currentTarget.classList.add('selected');
    categoriaSelecionada = e.currentTarget.getAttribute('data-cat');
  });
});

// ==========================================
// 1. ABRIR MODAL PARA NOVA LISTA
// ==========================================
btnNovaLista.addEventListener('click', () => {
  listaEmEdicaoId = null;
  tituloModalLista.textContent = 'Criar Nova Lista';
  document.getElementById('input-nome-lista').value = '';
  document.getElementById('input-orcamento-lista').value = '';
  
  // Reseta para categoria padrão
  document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
  document.querySelector('.cat-option[data-cat="mercado"]').classList.add('selected');
  categoriaSelecionada = 'mercado';
  
  modalLista.style.display = 'flex';
});

btnFecharModal.addEventListener('click', () => {
  modalLista.style.display = 'none';
  listaEmEdicaoId = null;
});

// ==========================================
// 2. SALVAR OU ATUALIZAR LISTA
// ==========================================
btnSalvarLista.addEventListener('click', async () => {
  const nome = document.getElementById('input-nome-lista').value;
  const orcamento = parseFloat(document.getElementById('input-orcamento-lista').value) || 0;
  if (!nome) return mostrarToast('Dê um nome para a sua lista!', 'error');

  if (listaEmEdicaoId) {
    // MODO EDIÇÃO
    await db.listas.update(listaEmEdicaoId, {
      nome: nome,
      orcamento: orcamento,
      categoria: categoriaSelecionada
    });
    mostrarToast('Lista atualizada com sucesso!', 'success');
  } else {
    // MODO CRIAÇÃO
    await db.listas.add({ 
      id: generateUUID(), 
      nome, 
      categoria: categoriaSelecionada, 
      orcamento, 
      created_at: new Date().toISOString(), 
      user_id: 'local' 
    });
    mostrarToast('Lista criada com sucesso!', 'success');
  }

  modalLista.style.display = 'none';
  listaEmEdicaoId = null;
  carregarListas();
});

// ==========================================
// 3. RENDERIZAÇÃO DO GRÁFICO E LISTAS
// ==========================================
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

async function carregarListas() {
  const listas = await db.listas.toArray();
  listasContainer.innerHTML = ''; 

  if (listas.length === 0) {
    emptyState.style.display = 'block';
    renderizarGrafico([], [], []);
    return;
  }
  
  emptyState.style.display = 'none';
  const labels = []; const orcs = []; const gasts = [];

  // Ordena listas da mais nova para a mais velha
  listas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  for (const lista of listas) {
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
    card.className = 'lista-card';
    
    // Adicionamos o botão de Editar junto do Clonar e Excluir
    card.innerHTML = `
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem; gap: 0.5rem;">
        
        <div style="display: flex; align-items: center; flex: 1; overflow: hidden; gap: 0.75rem;">
          <div class="cat-icon-card" style="background-color: ${catDetalhes.cor}; margin: 0; flex-shrink: 0;">
            <span class="material-symbols-rounded">${catDetalhes.icone}</span>
          </div>
          <div style="overflow: hidden;">
            <h3 style="margin: 0; font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lista.nome}</h3>
            <span style="color: var(--text-muted); font-size: 0.8rem;">${dataFormatada}</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.25rem; flex-shrink: 0; z-index: 10;">
           <button class="btn-icon btn-editar-lista" data-id="${lista.id}" style="color: var(--primary-color);" title="Editar">
             <span class="material-symbols-rounded" style="font-size: 1.4rem;">edit</span>
           </button>
           <button class="btn-icon btn-clonar" data-id="${lista.id}" style="color: var(--text-muted);" title="Duplicar">
             <span class="material-symbols-rounded" style="font-size: 1.4rem;">content_copy</span>
           </button>
           <button class="btn-icon btn-excluir-lista" data-id="${lista.id}" style="color: var(--danger);" title="Excluir">
             <span class="material-symbols-rounded" style="font-size: 1.4rem;">delete</span>
           </button>
        </div>
      </div>

      <div class="progress-container">
        <div class="progress-labels"><span>R$ ${gastoTotal.toFixed(2)}</span><span>R$ ${orcamento.toFixed(2)}</span></div>
        <div class="progress-bar-bg"><div class="progress-fill" style="width: ${porcentagem}%; background-color: ${corBarra};"></div></div>
      </div>
    `;
      
    // Previne que o clique nos botões abra a lista
    card.addEventListener('click', (e) => {
      if(!e.target.closest('.btn-clonar') && !e.target.closest('.btn-excluir-lista') && !e.target.closest('.btn-editar-lista')) {
        window.location.href = `/lista.html?id=${lista.id}`;
      }
    });
    listasContainer.appendChild(card);
  }

  // EVENTO DE EDITAR LISTA
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
         
         // Atualiza a categoria visualmente
         document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
         const catOption = document.querySelector(`.cat-option[data-cat="${lista.categoria}"]`);
         if(catOption) catOption.classList.add('selected');
         categoriaSelecionada = lista.categoria;

         modalLista.style.display = 'flex';
       }
    });
  });

  // EVENTO DE EXCLUIR
  document.querySelectorAll('.btn-excluir-lista').forEach(btn => {
    btn.addEventListener('click', async (e) => {
       e.stopPropagation();
       if(confirm('Excluir esta lista e todos os seus produtos?')) {
          const id = e.currentTarget.getAttribute('data-id');
          await db.itens.where('lista_id').equals(id).delete();
          await db.listas.delete(id);
          mostrarToast('Lista excluída!', 'success');
          carregarListas();
       }
    });
  });

  // EVENTO DE CLONAR
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

  renderizarGrafico(labels.slice(0, 5), orcs.slice(0, 5), gasts.slice(0, 5));
}

// ==========================================
// 4. AUTENTICAÇÃO E IMPORTAÇÃO
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