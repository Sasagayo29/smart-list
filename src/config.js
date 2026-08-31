import { supabase } from './supabase.js';
import { db } from './db.js';
import { mostrarToast } from './utils.js';

// Carrega os dados do usuário
async function carregarPerfil() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById('user-email').textContent = session.user.email;
  } else {
    window.location.href = '/login.html';
  }
}

// Lógica de Logout Segura
document.getElementById('btn-logout').addEventListener('click', async () => {
  if (confirm('Tem certeza que deseja sair da sua conta? Seus dados não sincronizados serão perdidos.')) {
    await supabase.auth.signOut();
    await db.listas.clear();
    await db.itens.clear();
    window.location.href = '/login.html';
  }
});

// Ferramenta de Limpeza Local
document.getElementById('btn-limpar-cache').addEventListener('click', async () => {
  if (confirm('Isso vai apagar todas as listas e itens salvos APENAS no celular. Deseja continuar?')) {
    await db.listas.clear();
    await db.itens.clear();
    mostrarToast('Banco local limpo com sucesso!', 'success');
  }
});

carregarPerfil();