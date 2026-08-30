import { supabase } from './supabase.js';

const inputEmail = document.getElementById('input-email');
const inputSenha = document.getElementById('input-senha');
const btnEntrar = document.getElementById('btn-entrar');
const btnCadastrar = document.getElementById('btn-cadastrar');
const msgErro = document.getElementById('msg-erro');

// Verifica se já está logado
async function checarSessao() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = '/'; // Vai direto pro Dashboard
  }
}
checarSessao();

function mostrarErro(mensagem) {
  msgErro.textContent = mensagem;
  msgErro.style.display = 'block';
}

// Fazer Login
btnEntrar.addEventListener('click', async () => {
  const email = inputEmail.value;
  const password = inputSenha.value;
  
  if (!email || !password) return mostrarErro('Preencha todos os campos!');
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    mostrarErro('Credenciais inválidas. Tente novamente.');
  } else {
    window.location.href = '/';
  }
});

// Criar Conta
btnCadastrar.addEventListener('click', async () => {
  const email = inputEmail.value;
  const password = inputSenha.value;
  
  if (!email || !password) return mostrarErro('Preencha todos os campos!');
  
  const { error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    mostrarErro('Erro ao criar conta: ' + error.message);
  } else {
    alert('Conta criada com sucesso! Você já pode entrar.');
  }
});