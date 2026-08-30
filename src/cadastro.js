import { supabase } from './supabase.js';

const inputEmail = document.getElementById('input-email-cad');
const inputSenha = document.getElementById('input-senha-cad');
const inputSenhaConf = document.getElementById('input-senha-conf');
const btnCadastrar = document.getElementById('btn-cadastrar-novo');
const btnVoltar = document.getElementById('btn-voltar-login');
const msgErro = document.getElementById('msg-erro-cad');

function mostrarErro(mensagem) {
  msgErro.textContent = mensagem;
  msgErro.style.display = 'block';
}

btnVoltar.addEventListener('click', () => {
  window.location.href = '/login.html';
});

btnCadastrar.addEventListener('click', async () => {
  const email = inputEmail.value;
  const password = inputSenha.value;
  const confirmPassword = inputSenhaConf.value;
  
  if (!email || !password || !confirmPassword) {
    return mostrarErro('Preencha todos os campos!');
  }

  if (password !== confirmPassword) {
    return mostrarErro('As senhas não coincidem!');
  }

  if (password.length < 6) {
    return mostrarErro('A senha deve ter pelo menos 6 caracteres.');
  }

  // Altera o texto do botão para indicar carregamento
  const textoOriginal = btnCadastrar.textContent;
  btnCadastrar.textContent = 'Criando conta...';
  btnCadastrar.disabled = true;
  
  const { error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    mostrarErro('Erro ao criar conta: ' + error.message);
    btnCadastrar.textContent = textoOriginal;
    btnCadastrar.disabled = false;
  } else {
    // Como desativamos a confirmação de e-mail, podemos logar o usuário ou mandar pro login direto
    alert('Conta criada com sucesso! Redirecionando...');
    window.location.href = '/';
  }
});