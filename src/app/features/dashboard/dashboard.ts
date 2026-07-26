import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToastService } from '../../shared/components/toast'; // 👇 Importe o serviço
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';
import { ListaCompra } from '../../core/models/compra.modal';
import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core'; // 👈 Importação
// 👇 Importe o serviço do Supabase
import { SupabaseService } from '../../core/services/supabase/supabase'; 

interface ListaViewModel extends ListaCompra {
  gastoTotal: number;
  progresso: number;
  categoria?: string; // 👈 Adicione esta linha (a interrogação significa que é opcional nas listas antigas)
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
  private cdr = inject(ChangeDetectorRef); // 👈 Injeção

  listas: ListaViewModel[] = [];
  isModalOpen = false;
  novaListaNome = '';
  novaListaOrcamento: number | null = null;
  // Novas variáveis
  isConfigOpen = false;
  temaEscolhido = 'sistema';

  // Adicione estas variáveis logo abaixo da declaração das suas listas
  categorias = [
    { id: 'mercado', nome: 'Mercado', icone: 'shopping_cart', cor: '#10b981' }, // Verde
    { id: 'shopping', nome: 'Shopping', icone: 'local_mall', cor: '#8b5cf6' }, // Roxo
    { id: 'farmacia', nome: 'Farmácia', icone: 'vaccines', cor: '#ef4444' }, // Vermelho
    { id: 'trabalho', nome: 'Trabalho', icone: 'work', cor: '#3b82f6' }, // Azul
    { id: 'outros', nome: 'Outros', icone: 'category', cor: '#64748b' } // Cinza
  ];
  novaListaCategoria = 'mercado'; // Categoria padrão

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
    
    // 👈 Força o Dashboard a mostrar os valores da lista de primeira, sem precisar de F5
    this.cdr.detectChanges(); 
  }

  abrirModalNovaLista() {
    this.isModalOpen = true;
  }

  // Atualize a função de fechar modal para resetar a categoria
  fecharModal() {
    this.isModalOpen = false;
    this.novaListaNome = '';
    this.novaListaOrcamento = null;
    this.novaListaCategoria = 'mercado';
  }

  // Na função salvarLista, adicione a categoria ao objeto:
  async salvarLista() {
    if (!this.novaListaNome) return;

    const novaLista: any = { // Usamos any temporariamente caso sua interface ListaCompra não tenha 'categoria'
      id: this.localDb.generateUUID(),
      nome: this.novaListaNome,
      orcamento: this.novaListaOrcamento || 0,
      categoria: this.novaListaCategoria, // 👈 Nova propriedade
      created_at: new Date().toISOString(),
      user_id: 'local', 
      finalizada: false 
    };

    await this.localDb.listas.add(novaLista);
    this.fecharModal();
    await this.carregarListas(); 
  }
  
  // Função para puxar o ícone e cor corretos na tela
  getCategoriaDetalhes(categoriaId: string) {
    return this.categorias.find(c => c.id === categoriaId) || this.categorias[4];
  }

  irParaLista(id: string) {
    this.router.navigate(['/lista-itens', id]); 
  }
}