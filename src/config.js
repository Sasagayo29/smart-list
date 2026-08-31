import { supabase } from './supabase.js';
import { db } from './db.js';
import { mostrarToast } from './utils.js';

async function carregarPerfil() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    document.getElementById('user-email').textContent = session.user.email;
  } else {
    document.getElementById('user-email').textContent = 'Conta Local (Offline)';
    document.getElementById('btn-logout').innerHTML = '<span class="material-symbols-rounded">login</span> Fazer Login';
    document.getElementById('btn-logout').style.backgroundColor = 'var(--primary-color)';
  }
}

// 🌓 LÓGICA DO TEMA CLARO/ESCURO
const btnTema = document.getElementById('btn-tema');
const iconeTema = document.getElementById('icone-tema');
const textoTema = document.getElementById('texto-tema');

// Inicia com os textos corretos se estiver no modo claro
if (localStorage.getItem('theme') === 'light') {
  document.documentElement.classList.add('light-theme');
  iconeTema.textContent = 'light_mode';
  textoTema.textContent = 'Aparência (Claro)';
}

btnTema.addEventListener('click', () => {
  document.documentElement.classList.toggle('light-theme');
  const isLight = document.documentElement.classList.contains('light-theme');
  
  if (isLight) {
    localStorage.setItem('theme', 'light');
    iconeTema.textContent = 'light_mode';
    textoTema.textContent = 'Aparência (Claro)';
    mostrarToast('Tema Claro ativado!', 'success');
  } else {
    localStorage.setItem('theme', 'dark');
    iconeTema.textContent = 'dark_mode';
    textoTema.textContent = 'Aparência (Escuro)';
    mostrarToast('Tema Escuro ativado!', 'success');
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return window.location.href = '/login.html';

  if (confirm('Sair da conta? Seus dados não sincronizados serão perdidos.')) {
    await supabase.auth.signOut();
    await db.listas.clear();
    await db.itens.clear();
    window.location.href = '/login.html';
  }
});

document.getElementById('btn-limpar-cache').addEventListener('click', async () => {
  if (confirm('Apagar todas as listas e itens salvos APENAS no celular?')) {
    await db.listas.clear(); await db.itens.clear();
    mostrarToast('Banco local limpo com sucesso!', 'success');
  }
});

carregarPerfil();