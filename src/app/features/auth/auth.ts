import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase/supabase';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class AuthComponent {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoginMode = true; // Controla se a tela é de Login ou Cadastro
  isLoading = false;
  errorMessage = '';

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.password = '';
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, preencha o e-mail e a senha.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      if (this.isLoginMode) {
        // Fluxo de Login
        const { error } = await this.supabaseService.supabase.auth.signInWithPassword({
          email: this.email,
          password: this.password,
        });
        if (error) throw error;
      } else {
        // Fluxo de Cadastro
        const { error } = await this.supabaseService.supabase.auth.signUp({
          email: this.email,
          password: this.password,
        });
        if (error) throw error;
        alert('Conta criada com sucesso! Você já pode entrar.');
        this.isLoginMode = true; 
        return;
      }
      
      // Se deu tudo certo no login, redireciona para o Dashboard
      this.router.navigate(['/dashboard']);
      
    } catch (error: any) {
      this.errorMessage = error.message || 'Ocorreu um erro na autenticação.';
    } finally {
      this.isLoading = false;
    }
  }
}