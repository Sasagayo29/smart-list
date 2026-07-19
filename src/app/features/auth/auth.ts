import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Adicionado
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
  private router = inject(Router); // Adicionado

  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  async handleLogin() {
    this.isLoading = true;
    this.errorMessage = '';
    const { error } = await this.supabaseService.signIn(this.email, this.password);
    
    if (error) {
      this.errorMessage = error.message;
    } else {
      this.router.navigate(['/dashboard']); // Redireciona
    }
    this.isLoading = false;
  }

  async handleRegister() {
    this.isLoading = true;
    this.errorMessage = '';
    const { error } = await this.supabaseService.signUp(this.email, this.password);
    
    if (error) {
      this.errorMessage = error.message;
    } else {
      this.router.navigate(['/dashboard']); // Redireciona
    }
    this.isLoading = false;
  }
}