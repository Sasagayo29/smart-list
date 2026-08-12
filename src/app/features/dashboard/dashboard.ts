import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈 FormsModule é vital para capturar o que você digita!
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private localDb = inject(LocalDbService);
  private cdr = inject(ChangeDetectorRef);

  listas: any[] = [];
  
  // ==========================================
  // CONTROLES DOS MODAIS
  // ==========================================
  isModalOpen = false;
  novaListaNome = '';
  novaListaOrcamento: number | null = null;
  novaListaCategoria = 'mercado';

  isConfigOpen = false;
  temaEscolhido = 'sistema';

  // Categorias com cores e ícones premium
  categorias = [
    { id: 'mercado', nome: 'Mercado', icone: 'shopping_cart', cor: '#3b82f6' },
    { id: 'farmacia', nome: 'Farmácia', icone: 'medical_services', cor: '#ef4444' },
    { id: 'construcao', nome: 'Construção', icone: 'handyman', cor: '#f59e0b' },
    { id: 'outros', nome: 'Outros', icone: 'category', cor: '#64748b' }
  ];

  async ngOnInit() {
    await this.carregarListas();
  }

  async carregarListas() {
    this.listas = await this.localDb.listas.toArray();
    
    // Calcula o progresso do orçamento de cada lista com base nos itens salvos offline
    for (let lista of this.listas) {
      const itens = await this.localDb.itens.where('lista_id').equals(lista.id).toArray();
      lista.gastoTotal = itens.reduce((acc: number, item: any) => acc + (item.quantidade * item.preco_unitario), 0);
      lista.progresso = lista.orcamento > 0 ? Math.min((lista.gastoTotal / lista.orcamento) * 100, 100) : 0;
    }
    
    this.cdr.detectChanges(); // ⚡ Atualiza a tela instantaneamente
  }

  getCategoriaDetalhes(categoriaId: string | undefined) {
    if (!categoriaId) return this.categorias[3];
    return this.categorias.find(c => c.id === categoriaId) || this.categorias[3];
  }

  irParaLista(id: string) {
    this.router.navigate(['/lista', id]);
  }

  // ==========================================
  // LÓGICA DE CRIAR NOVA LISTA
  // ==========================================
  abrirModalNovaLista() {
    this.isModalOpen = true;
    this.novaListaNome = '';
    this.novaListaOrcamento = null;
    this.novaListaCategoria = 'mercado';
    this.cdr.detectChanges(); 
  }

  fecharModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges(); 
  }

  async salvarLista() {
    if (!this.novaListaNome) return;

    // Removemos a obrigatoriedade do user_id real para testes offline fluírem
    const novaLista = {
      id: this.localDb.generateUUID(), 
      nome: this.novaListaNome,
      orcamento: this.novaListaOrcamento || 0,
      categoria: this.novaListaCategoria,
      finalizada: false,
      created_at: new Date().toISOString(),
      user_id: null 
    };

    await this.localDb.listas.add(novaLista);
    this.fecharModal();
    await this.carregarListas();
  }

  // ==========================================
  // LÓGICA DE CONFIGURAÇÕES
  // ==========================================
  abrirConfiguracoes() {
    this.isConfigOpen = true;
    this.cdr.detectChanges();
  }

  fecharConfiguracoes() {
    this.isConfigOpen = false;
    this.cdr.detectChanges();
  }

  mudarTema(tema: string) {
    this.temaEscolhido = tema;
    // Aqui você conectará com a lógica do body (ex: document.body.classList.add('dark-theme'))
  }

  sair() {
    alert('Função de Logout será conectada em breve!');
  }
}