import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  // Conecta ao Supabase usando as variáveis de ambiente do Vercel
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // Faz uma leitura levíssima apenas para "acordar" o banco
    const { data, error } = await supabase.from('listas').select('id').limit(1);
    
    if (error) throw error;
    
    return response.status(200).json({ 
      status: 'Acordado', 
      mensagem: 'O Supabase está ativo e imune à hibernação! 🛡️',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return response.status(500).json({ erro: 'Falha ao acordar o banco', detalhes: error.message });
  }
}