import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js';
import { mostrarToast } from './utils.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

const btnNovaLista = document.getElementById('btn-nova-lista');
const modalLista = document.getElementById('modal-lista');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnSalvarLista = document.getElementById('btn-salvar-lista');
const listasContainer = document.getElementById('listas-container');
const emptyState = document.getElementById('empty-state');
const btnBaixarNuvem = document.getElementById('btn-baixar-nuvem');
const btnConfig = document.getElementById('btn-config'); 

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

btnNovaLista.addEventListener('click', () => {
  document.getElementById('input-nome-lista').value = '';
  document.getElementById('input-orcamento-lista').value = '';
  modalLista.style.display = 'flex';
});
btnFecharModal.addEventListener('click', () => modalLista.style.display = 'none');

btnSalvarLista.addEventListener('click', async () => {
  const nome = document.getElementById('input-nome-lista').value;
  const orcamento = parseFloat(document.getElementById('input-orcamento-lista').value) || 0;
  if (!nome) return mostrarToast('Dê um nome para a sua lista!', 'error');

  await db.listas.add({ id: generateUUID(), nome, categoria: categoriaSelecionada, orcamento, created_at: new Date().toISOString(), user_id: 'local' });
  modalLista.style.display = 'none';
  mostrarToast('Lista criada com sucesso!', 'success');
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
    
    // Adicionamos os botões de Clonar e Excluir protegidos contra quebra de linha
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
      if(!e.target.closest('.btn-clonar') && !e.target.closest('.btn-excluir-lista')) {
        window.location.href = `/lista.html?id=${lista.id}`;
      }
    });
    listasContainer.appendChild(card);
  }

  // ATIVA OS BOTÕES DE AÇÃO DOS CARTÕES
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

  document.querySelectorAll('.btn-clonar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
       e.stopPropagation();
       const id = e.currentTarget.getAttribute('data-id');
       const listaAntiga = await db.listas.get(id);
       const itensAntigos = await db.itens.where('lista_id').equals(id).toArray();
       const novaListaId = generateUUID();
       
       await db.listas.add({ ...listaAntiga, id: novaListaId, nome: listaAntiga.nome + ' (Cópia)', created_at: new Date().toISOString() });
       for(const item of itensAntigos) {
          await db.itens.add({ ...item, id: generateUUID(), lista_id: novaListaId, comprado: false }); // Clona com tudo desmarcado!
       }
       
       mostrarToast('Lista duplicada com sucesso!', 'success');
       carregarListas();
    });
  });

  renderizarGrafico(labels.slice(-5), orcs.slice(-5), gasts.slice(-5));
}

import * as XLSX from 'xlsx'; // Importação necessária para o Excel

async function verificarUsuario() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    btnBaixarNuvem.style.display = 'flex'; 
    // Removemos aquele código que estragava o botão de config!
  }
}
verificarUsuario();

// ==========================================
// IMPORTAR LISTA INTEIRA DO EXCEL/TXT
// ==========================================
const inputImportDashboard = document.getElementById('input-import-dashboard');
if (inputImportDashboard) {
  inputImportDashboard.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extensao = file.name.split('.').pop().toLowerCase();
    const nomeLista = file.name.replace(/\.[^/.]+$/, ""); // Pega o nome do arquivo
    const novaListaId = generateUUID();

    try {
      // Cria a capa da lista
      await db.listas.add({ id: novaListaId, nome: `Importada: ${nomeLista}`, categoria: 'outros', orcamento: 0, created_at: new Date().toISOString(), user_id: 'local' });

      // Lê o conteúdo
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
    e.target.value = ''; // Limpa o input
  });
}

// Lógica de Sincronização
btnBaixarNuvem.addEventListener('click', async () => {
  const icone = btnBaixarNuvem.querySelector('span');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return window.location.href = '/login.html'; // Redireciona sutilmente

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