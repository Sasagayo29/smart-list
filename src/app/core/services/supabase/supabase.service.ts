import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Substitua com as chaves reais do seu projeto
  private readonly SUPABASE_URL = 'https://vazjnnelazrbnavrixbl.supabase.co';
  private readonly SUPABASE_KEY = 'sb_publishable_j96gSWYk3dSfVqiVQxs-TQ_wBfIGVop';

  constructor() {
    this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
  }

  // Função para enviar os dados offline para a nuvem
  async sincronizarItens(itensLocais: any[]) {
    try {
      // No Supabase, o comando 'upsert' insere ou atualiza registros automaticamente
      const { data, error } = await this.supabase
        .from('itens_lista')
        .upsert(itensLocais);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao sincronizar com Supabase:', error);
      throw error;
    }
  }
}