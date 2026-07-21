import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase/supabase'; // Ajuste o caminho se necessário

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // Pergunta ao Supabase se existe uma sessão ativa (usuário logado)
  const { data } = await supabaseService.supabase.auth.getSession();

  if (data.session) {
    // Tem sessão ativa, pode passar
    return true;
  } else {
    // Não tem sessão, bloqueia e manda pro login
    router.navigate(['/auth']);
    return false;
  }
};