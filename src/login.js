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

// Substitua o evento do btnCadastrar por este:
const btnIrCadastro = document.getElementById('btn-ir-cadastro');
if (btnIrCadastro) {
  btnIrCadastro.addEventListener('click', () => {
    window.location.href = '/cadastro.html';
  });
}