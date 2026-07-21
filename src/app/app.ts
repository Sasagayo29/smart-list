import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { ToastComponent } from './shared/components/toast'; // 👇 Importação
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent], // 👇 Adicionado aqui
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast> <!-- 👇 Colocado na raiz do app -->
  `,
})
export class AppComponent implements OnInit {
  private swUpdate = inject(SwUpdate);
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // 🌟 LÓGICA DE INICIALIZAÇÃO DO TEMA 🌟
      // Ao abrir o app ou atualizar a página, lê o que foi salvo
      const temaSalvo = localStorage.getItem('smartlist-tema');
      if (temaSalvo && temaSalvo !== 'sistema') {
        document.body.classList.add(`tema-${temaSalvo}`);
      }
    }
    // Verifica se o Service Worker está ativo no navegador/celular
    if (this.swUpdate.isEnabled) {
      // Fica escutando por novas versões publicadas no Vercel
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          // Quando achar uma versão nova, pergunta ao usuário
          const confirmar = confirm('✨ Uma nova versão do Smart List está disponível! Deseja atualizar agora?');
          
          if (confirmar) {
            // Recarrega a página para aplicar os novos arquivos do cache
            window.location.reload();
          }
        }
      });
    }
  }
}