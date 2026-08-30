import Dexie from 'dexie';

// 1. Inicializa o banco de dados local
export const db = new Dexie('SmartListDB_v2');

// 2. Define a estrutura das tabelas e os índices de busca rápida
db.version(1).stores({
  // Tabela de Listas: 'id' é a chave principal. 
  // Colocamos os outros campos aqui para o Dexie indexar e permitir buscas rápidas.
  listas: 'id, nome, categoria, created_at, user_id',
  
  // Tabela de Itens: 'id' é a chave. 'lista_id' é essencial para amarrarmos o item à lista certa.
  itens: 'id, lista_id, nome, comprado, user_id'
});

// 3. Função utilitária para gerar IDs únicos (UUID) offline
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback caso o navegador antigo não suporte crypto.randomUUID natively
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}