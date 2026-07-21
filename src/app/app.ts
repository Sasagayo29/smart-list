import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker'; // 👇 Importa o verificador do PWA

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  private swUpdate = inject(SwUpdate);

  ngOnInit() {
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