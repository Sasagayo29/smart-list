import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // Importe a guarda que criamos
import { AuthComponent } from './features/auth/auth';
import { DashboardComponent } from './features/dashboard/dashboard';
import { ListaItensComponent } from './features/lista-itens/lista-itens';

export const routes: Routes = [
  // Rota raiz manda pro Login
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  
  // Rota de Login (Pública)
  { path: 'auth', component: AuthComponent },
  
  // Rotas Privadas (Protegidas pela Guarda)
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] // 👈 Trava ativada
  },
  { 
    path: 'lista-itens/:id', 
    component: ListaItensComponent, 
    canActivate: [authGuard] // 👈 Trava ativada
  },

  // Rota coringa (se digitar endereço errado, manda pro login)
  { path: '**', redirectTo: 'auth' }
];