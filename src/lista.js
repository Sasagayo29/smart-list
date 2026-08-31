import { db, generateUUID } from './db.js';
import { supabase } from './supabase.js'; // 👈 NOVA LINHA
import * as XLSX from 'xlsx';

// Função Global de Toast
export function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  
  // Define o ícone com base no tipo
  let icone = 'info';
  if (tipo === 'success') icone = 'check_circle';
  if (tipo === 'error') icone = 'error';

  toast.innerHTML = `
    <span class="material-symbols-rounded toast-icon">${icone}</span>
    <span>${mensagem}</span>
  `;

  container.appendChild(toast);

  // Remove do DOM após a animação terminar (3 segundos)
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

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
// Atualiza a Ilha Dinâmica com conversão segura
  const total = itens.reduce((acc, item) => acc + (item.quantidade * (parseFloat(item.preco_unitario) || 0)), 0);
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
    // CORREÇÃO: Converte o preço para número antes da matemática
    const preco = parseFloat(item.preco_unitario) || 0;
    const subtotal = item.quantidade * preco;
    
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-info">
        <h4>${item.nome}</h4>
        <span class="item-price">R$ ${preco.toFixed(2)} x ${item.quantidade}</span>
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
// SINCRONIZAÇÃO COM A NUVEM
// ==========================================
const btnSincronizar = document.getElementById('btn-sincronizar');

btnSincronizar.addEventListener('click', async () => {
  const iconeSync = btnSincronizar.querySelector('span');
  
  try {
    // 1. Pega o usuário logado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert('Você precisa fazer login para sincronizar!');
      window.location.href = '/login.html';
      return;
    }

    const userId = session.user.id;
    
    // Anima o ícone para mostrar que está carregando
    iconeSync.textContent = 'sync';
    iconeSync.style.animation = 'spin 1s linear infinite';

    // 2. Prepara a lista pai
    const listaLocal = await db.listas.get(listaId);
    if (!listaLocal) throw new Error('Lista não encontrada localmente.');

    const listaNuvem = {
      id: listaLocal.id,
      nome: listaLocal.nome,
      orcamento: parseFloat(listaLocal.orcamento) || 0,
      categoria: listaLocal.categoria,
      created_at: listaLocal.created_at, // Adicione esta linha para salvar a data!
      user_id: userId 
    };

    // 3. Prepara os itens
    const itensLocais = await db.itens.where('lista_id').equals(listaId).toArray();
    const itensNuvem = itensLocais.map(item => ({
      id: item.id,
      lista_id: item.lista_id,
      nome: item.nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      comprado: item.comprado,
      user_id: userId
    }));

    // 4. Envia para o Supabase (Upsert atualiza se existir ou cria se não existir)
    const { error: errorLista } = await supabase.from('listas').upsert(listaNuvem);
    if (errorLista) throw errorLista;

    if (itensNuvem.length > 0) {
      const { error: errorItens } = await supabase.from('itens').upsert(itensNuvem);
      if (errorItens) throw errorItens;
    }

    alert('Sincronização concluída com sucesso! ☁️');

  } catch (error) {
    console.error('Erro de Sync:', error);
    alert('Erro ao sincronizar: ' + error.message);
  } finally {
    // Para a animação
    iconeSync.style.animation = '';
    iconeSync.textContent = 'cloud_upload';
  }
});

// ==========================================
// LEITOR DE CÂMERA (OCR / Código de Barras)
// ==========================================
const inputCamera = document.getElementById('input-camera');

inputCamera.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Pega o ícone para fazer a animação de carregamento
  const labelCamera = document.querySelector('.camera-label');
  const iconeCamera = labelCamera.querySelector('span');
  
  // Muda o ícone para ampulheta e faz girar
  iconeCamera.textContent = 'hourglass_empty';
  iconeCamera.style.animation = 'spin 1s linear infinite';

  try {
    // Aqui aconteceria o envio para uma API de IA ou Tesseract.js
    // Simulando o tempo de processamento de 1.5 segundos:
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Exibe o resultado para o usuário confirmar
    const nomeIdentificado = prompt("Etiqueta lida! Confirme o nome do produto:", "Produto Escaneado");

    if (nomeIdentificado) {
      const precoIdentificado = parseFloat(prompt(`Qual o preço de ${nomeIdentificado}?`, "0.00")) || 0;

      // Salva direto no banco local
      await db.itens.add({
        id: generateUUID(),
        lista_id: listaId,
        nome: nomeIdentificado,
        quantidade: 1,
        preco_unitario: precoIdentificado,
        comprado: false,
        user_id: 'local'
      });
      
      carregarDados(); // Atualiza a Ilha Dinâmica instantaneamente
    }
  } catch (error) {
    console.error("Erro na leitura da imagem:", error);
    alert('Falha ao processar a imagem.');
  } finally {
    // Restaura o ícone da câmera ao normal
    iconeCamera.textContent = 'photo_camera';
    iconeCamera.style.animation = '';
    inputCamera.value = ''; // Limpa o input
  }
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

// ==========================================
// MÓDULO DA CALCULADORA FLUTUANTE
// ==========================================
const btnOpenCalc = document.getElementById('btn-open-calc');
const btnCloseCalc = document.getElementById('btn-close-calc');
const modalCalculadora = document.getElementById('modal-calculadora');
const calcDisplay = document.getElementById('calc-display');
const btnUsarValor = document.getElementById('btn-usar-valor');

let expressaoCalc = '';

// Abrir e Fechar Modal
btnOpenCalc.addEventListener('click', () => modalCalculadora.style.display = 'flex');
btnCloseCalc.addEventListener('click', () => modalCalculadora.style.display = 'none');
modalCalculadora.addEventListener('click', (e) => {
  if (e.target === modalCalculadora) modalCalculadora.style.display = 'none';
});

// Intercepta os cliques nos botões da calculadora
document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    const val = e.target.getAttribute('data-val');

    if (action === 'number' || action === 'operator') {
      if (calcDisplay.textContent === '0' && action !== 'operator' && val !== '.') {
        expressaoCalc = val;
      } else {
        expressaoCalc += val;
      }
      calcDisplay.textContent = expressaoCalc;
      
    } else if (action === 'clear') {
      expressaoCalc = '';
      calcDisplay.textContent = '0';
      
    } else if (action === 'delete') {
      expressaoCalc = expressaoCalc.toString().slice(0, -1);
      calcDisplay.textContent = expressaoCalc || '0';
      
    } else if (action === 'calculate') {
      try {
        // Função segura para calcular a string nativamente
        const resultado = new Function('return ' + expressaoCalc)();
        
        // Verifica se é infinito ou erro matemático (divisão por zero)
        if (!isFinite(resultado)) throw new Error('Cálculo Inválido');
        
        // Limita a 2 casas decimais se for quebrado
        expressaoCalc = Number.isInteger(resultado) ? resultado.toString() : resultado.toFixed(2);
        calcDisplay.textContent = expressaoCalc;
      } catch (err) {
        calcDisplay.textContent = 'Erro';
        expressaoCalc = '';
      }
    }
  });
});

// O grande truque: Usar o valor calculado e mandar direto para o input do item
btnUsarValor.addEventListener('click', () => {
  const valorCalculado = parseFloat(calcDisplay.textContent);
  
  if (!isNaN(valorCalculado) && valorCalculado > 0) {
    // 1. Fecha a calculadora
    modalCalculadora.style.display = 'none';
    
    // 2. Preenche os dados no modal de adicionar item
    inputs.nome.value = ''; // O usuário só precisa digitar o nome
    inputs.qtd.value = 1;
    inputs.preco.value = valorCalculado.toFixed(2); // Preço puxado da calculadora!
    
    // 3. Abre o modal de adicionar item instantaneamente
    modalItem.style.display = 'flex';
  } else {
    alert('Calcule um valor válido maior que zero primeiro!');
  }
});

// Inicia
carregarDados();