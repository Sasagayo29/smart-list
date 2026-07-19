import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/services/supabase/supabase';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class App implements OnInit {
  private supabaseService = inject(SupabaseService);

  ngOnInit() {
    // Acorda o banco de dados assim que o app é aberto
    this.supabaseService.manterBancoAtivo();
  }
}