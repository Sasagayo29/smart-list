import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToastService } from '../../shared/components/toast'; // 👇 Importe o serviço
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';
import { ListaCompra } from '../../core/models/compra.modal';
// 👇 Importe o serviço do Supabase
import { SupabaseService } from '../../core/services/supabase/supabase'; 

interface ListaViewModel extends ListaCompra {
  gastoTotal: number;
  progresso: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private localDb = inject(LocalDbService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private supabaseService = inject(SupabaseService); // 👇 Injete o serviço aqui
  private toastService = inject(ToastService); // 👇 Injeção do Toast

  listas: ListaViewModel[] = [];
  isModalOpen = false;
  novaListaNome = '';
  novaListaOrcamento: number | null = null;
  // Novas variáveis
  isConfigOpen = false;
  temaEscolhido = 'sistema';

  abrirConfiguracoes() {
    // Lê o que está salvo para o botão acender corretamente
    this.temaEscolhido = localStorage.getItem('smartlist-tema') || 'sistema';
    this.isConfigOpen = true;
  }

  fecharConfiguracoes() {
    this.isConfigOpen = false;
  }

  mudarTema(tema: string) {
    this.temaEscolhido = tema;
    
    // Salva a escolha do usuário para sobreviver ao refresh da página
    localStorage.setItem('smartlist-tema', tema);
    
    // Limpa as classes do body e aplica a nova
    document.body.classList.remove('tema-claro', 'tema-escuro');
    if (tema !== 'sistema') {
      document.body.classList.add(`tema-${tema}`);
    }

    // Dispara a nova notificação elegante
    this.toastService.mostrar(
      tema === 'sistema' ? 'Tema automático ativado' : `Tema ${tema} ativado`
    );
  }

  async sair() {
    const confirmar = confirm('Tem certeza que deseja sair do aplicativo?');
    if (confirmar) {
      await this.supabaseService.supabase.auth.signOut();
      this.toastService.mostrar('Sessão encerrada.'); // 👈 Usando Toast
      this.router.navigate(['/auth']);
    }
  }

  async ngOnInit() {
    // 👇 Bloqueia a execução no servidor do Vercel. Só roda no celular/navegador!
    if (isPlatformBrowser(this.platformId)) {
      await this.carregarListas();
    }
  }

  async carregarListas() {
    const listasBanco = await this.localDb.listas.toArray();
    const listasProcessadas: ListaViewModel[] = [];

    for (const lista of listasBanco) {
      const itens = await this.localDb.itens.where('lista_id').equals(lista.id!).toArray();
      
      const gastoTotal = itens.reduce((acc, item) => {
        return acc + (item.quantidade * (item.preco_unitario || 0));
      }, 0);

      let progresso = 0;
      if (lista.orcamento && lista.orcamento > 0) {
        progresso = (gastoTotal / lista.orcamento) * 100;
        if (progresso > 100) progresso = 100; 
      }

      listasProcessadas.push({
        ...lista,
        gastoTotal,
        progresso
      });
    }

    this.listas = listasProcessadas.sort((a, b) => 
      new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    );
  }

  abrirModalNovaLista() {
    this.isModalOpen = true;
  }

  fecharModal() {
    this.isModalOpen = false;
    this.novaListaNome = '';
    this.novaListaOrcamento = null;
  }

  async salvarLista() {
    if (!this.novaListaNome) return;

    const novaLista: ListaCompra = {
      id: this.localDb.generateUUID(),
      nome: this.novaListaNome,
      orcamento: this.novaListaOrcamento || 0,
      created_at: new Date().toISOString(),
      user_id: 'local', 
      finalizada: false 
    };

    await this.localDb.listas.add(novaLista);
    this.fecharModal();
    await this.carregarListas(); 
  }

  irParaLista(id: string) {
    this.router.navigate(['/lista-itens', id]); 
  }
}