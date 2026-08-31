export function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  
  let icone = 'info';
  if (tipo === 'success') icone = 'check_circle';
  if (tipo === 'error') icone = 'error';

  toast.innerHTML = `<span class="material-symbols-rounded toast-icon">${icone}</span><span>${mensagem}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}