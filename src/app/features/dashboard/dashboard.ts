import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';
import { SupabaseService } from '../../core/services/supabase/supabase';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private localDb = inject(LocalDbService);
  private supabaseService = inject(SupabaseService); // 👈 Serviço injetado para o Logout
  private cdr = inject(ChangeDetectorRef);

  listas: any[] = [];
  
  // ==========================================
  // CONTROLES DOS MODAIS
  // ==========================================
  isModalOpen = false;
  isConfigOpen = false;
  
  // Variáveis do Formulário de Lista
  listaEmEdicaoId: string | null = null; // 👈 Controle de Edição
  novaListaNome = '';
  novaListaOrcamento: number | null = null;
  novaListaCategoria = 'mercado';
  temaEscolhido = 'sistema';

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
    
    for (let lista of this.listas) {
      const itens = await this.localDb.itens.where('lista_id').equals(lista.id).toArray();
      lista.gastoTotal = itens.reduce((acc: number, item: any) => acc + (item.quantidade * item.preco_unitario), 0);
      lista.progresso = lista.orcamento > 0 ? Math.min((lista.gastoTotal / lista.orcamento) * 100, 100) : 0;
    }
    
    this.cdr.detectChanges();
  }

  getCategoriaDetalhes(categoriaId: string | undefined) {
    if (!categoriaId) return this.categorias[3];
    return this.categorias.find(c => c.id === categoriaId) || this.categorias[3];
  }

  irParaLista(id: string) {
    this.router.navigate(['/lista', id]);
  }

  // ==========================================
  // LÓGICA DE CRIAR / EDITAR LISTA
  // ==========================================
  abrirModalNovaLista() {
    this.listaEmEdicaoId = null;
    this.novaListaNome = '';
    this.novaListaOrcamento = null;
    this.novaListaCategoria = 'mercado';
    this.isModalOpen = true;
    this.cdr.detectChanges(); 
  }

  // 👇 Nova função para abrir o modal com os dados preenchidos
  abrirModalEditarLista(lista: any, event: Event) {
    event.stopPropagation(); // Evita que o clique abra a lista (irParaLista)
    this.listaEmEdicaoId = lista.id;
    this.novaListaNome = lista.nome;
    this.novaListaOrcamento = lista.orcamento;
    this.novaListaCategoria = lista.categoria;
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  fecharModal() {
    this.isModalOpen = false;
    this.listaEmEdicaoId = null;
    this.cdr.detectChanges(); 
  }

  async salvarLista() {
    if (!this.novaListaNome) return;

    const listaDados: any = {
      nome: this.novaListaNome,
      orcamento: this.novaListaOrcamento || 0,
      categoria: this.novaListaCategoria,
      finalizada: false,
      user_id: 'local'
    };

    if (this.listaEmEdicaoId) {
      // ✏️ Atualiza lista existente
      await this.localDb.listas.update(this.listaEmEdicaoId, listaDados);
    } else {
      // ➕ Cria nova lista
      listaDados.id = this.localDb.generateUUID();
      listaDados.created_at = new Date().toISOString();
      await this.localDb.listas.add(listaDados);
    }

    this.fecharModal();
    await this.carregarListas();
  }

  // 👇 Nova função para exclusão de lista
  async excluirLista(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta lista e todos os seus itens?')) {
      await this.localDb.listas.delete(id);
      // Aqui idealmente você também deletaria os itens ligados a essa lista no IndexedDB
      await this.carregarListas();
    }
  }

  // ==========================================
  // LÓGICA DE CONFIGURAÇÕES E LOGOUT
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
  }

  // 👇 Logout real conectado ao Supabase
  async sair() {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro ao sair:', error);
      // Força a navegação caso o usuário esteja offline
      this.router.navigate(['/login']); 
    }
  }
}