import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session: BehaviorSubject<Session | null> = new BehaviorSubject<Session | null>(null);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.loadSession();
  }

  get session$(): Observable<Session | null> {
    return this._session.asObservable();
  }

  get supabaseClient(): SupabaseClient {
    return this.supabase;
  }

  private loadSession() {
    this.supabase.auth.getSession().then(({ data }) => {
      this._session.next(data.session);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.next(session);
    });
  }

  async signInWithEmail(email: string) {
    return await this.supabase.auth.signInWithOtp({ email });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  // 👇 NOVA FUNÇÃO ADICIONADA AQUI NO FINAL 👇
  async sincronizarItens(itensLocais: any[]) {
    try {
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

  // 👇 FUNÇÃO ANTI-HIBERNAÇÃO 👇
  async manterBancoAtivo() {
    try {
      // Faz uma leitura minúscula e super leve apenas para registrar atividade na nuvem
      await this.supabase.from('itens_lista').select('id').limit(1);
      console.log('☁️ Ping enviado ao Supabase: Banco ativo!');
    } catch (error) {
      // Falha silenciosa para não atrapalhar o usuário caso esteja sem internet
      console.warn('Ping offline (Supabase inacessível no momento).');
    }
  }
}