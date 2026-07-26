import { Component, inject, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';
import { SupabaseService } from '../../core/services/supabase/supabase';
import { ListaCompra, ItemCompra } from '../../core/models/compra.modal';

@Component({
  selector: 'app-lista-itens',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-itens.html',
  styleUrls: ['./lista-itens.css']
})
export class ListaItensComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private localDb = inject(LocalDbService);
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef); // 👈 O motor de velocidade da tela
  private platformId = inject(PLATFORM_ID);

  listaId: string = '';
  listaAtual: ListaCompra | undefined;
  itens: ItemCompra[] = [];
  totalLista: number = 0;

  // Controles de UI
  isModalOpen = false;
  isProcessandoImagem = false;
  isSincronizando = false;
  
  // Controles do Formulário
  itemEmEdicaoId: string | null = null;
  novoItemNome = '';
  novoItemQtd = 1;
  novoItemPreco: number | null = null;

  // Controles da Calculadora
  isCalcOpen = false;
  calcVisor = '';

  ngOnInit() {
    this.listaId = this.route.snapshot.paramMap.get('id') || '';
    if (this.listaId && isPlatformBrowser(this.platformId)) {
      this.carregarDados();
    }
  }

  async carregarDados() {
    this.listaAtual = await this.localDb.listas.get(this.listaId);
    this.itens = await this.localDb.itens.where('lista_id').equals(this.listaId).toArray();
    this.calcularTotal();
    
    // ⚡ Força a tela a atualizar no mesmo milissegundo que os dados chegam
    this.cdr.detectChanges(); 
  }

  calcularTotal() {
    this.totalLista = this.itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0);
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }

  // ==========================================
  // MODAIS E FORMULÁRIOS
  // ==========================================
  abrirModal(item?: ItemCompra) {
    if (item) {
      this.itemEmEdicaoId = item.id!;
      this.novoItemNome = item.nome;
      this.novoItemQtd = item.quantidade;
      this.novoItemPreco = item.preco_unitario;
    } else {
      this.itemEmEdicaoId = null;
      this.novoItemNome = '';
      this.novoItemQtd = 1;
      this.novoItemPreco = null;
    }
    this.isModalOpen = true;
    this.cdr.detectChanges(); // ⚡ Abertura instantânea
  }

  fecharModal() {
    this.isModalOpen = false;
    this.itemEmEdicaoId = null;
    this.novoItemNome = '';
    this.novoItemQtd = 1;
    this.novoItemPreco = null;
    this.cdr.detectChanges(); // ⚡ Fechamento instantâneo
  }

  async salvarItem() {
    if (!this.novoItemNome || this.novoItemQtd < 1) return;

    const itemSalvar: ItemCompra = {
      id: this.itemEmEdicaoId || this.localDb.generateUUID(),
      lista_id: this.listaId,
      nome: this.novoItemNome,
      quantidade: this.novoItemQtd,
      preco_unitario: this.novoItemPreco || 0,
      codigo_barras: undefined, // 👈 O erro estava aqui. Trocamos null por undefined!
      comprado: false,
      created_at: new Date().toISOString(),
      user_id: 'local'
    };

    if (this.itemEmEdicaoId) {
      await this.localDb.itens.update(this.itemEmEdicaoId, itemSalvar);
    } else {
      await this.localDb.itens.add(itemSalvar);
    }

    this.fecharModal();
    await this.carregarDados();
  }

  async excluirItem(id: string) {
    const confirmar = confirm('Tem certeza que deseja excluir este produto?');
    if (confirmar) {
      await this.localDb.itens.delete(id);
      await this.carregarDados();
    }
  }

  // ==========================================
  // NUVEM E CÂMERA
  // ==========================================
  abrirCamera() {
    alert('Recurso de leitura de etiqueta em desenvolvimento!');
  }

  async sincronizarNuvem() {
    this.isSincronizando = true;
    this.cdr.detectChanges(); // ⚡
    
    try {
      const itensLocais = await this.localDb.itens.toArray();
      if (itensLocais.length === 0) {
        alert('A lista está vazia. Não há o que sincronizar.');
        this.isSincronizando = false;
        return;
      }
      
      // Chama o Supabase (garanta que seu SupabaseService tenha esse método)
      await this.supabaseService.sincronizarItens(itensLocais);
      alert('Sincronização concluída com sucesso! ☁️');
      
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      // 🐛 Mostra o erro exato que o Supabase está retornando
      alert(`Falha na nuvem: ${error.message || 'Erro de permissão ou conexão no Supabase.'}`);
    } finally {
      this.isSincronizando = false;
      this.cdr.detectChanges(); // ⚡
    }
  }

  // ==========================================
  // LÓGICA DA CALCULADORA
  // ==========================================
  abrirCalculadora() { 
    this.isCalcOpen = true; 
    this.cdr.detectChanges(); 
  }
  
  fecharCalculadora() { 
    this.isCalcOpen = false; 
    this.cdr.detectChanges(); 
  }

  limparCalc() {
    this.calcVisor = '';
  }

  addCalc(valor: string) {
    this.calcVisor += valor;
  }

  calcular() {
    try {
      // Usamos eval com cuidado aqui, apenas para matemática básica interna
      const resultado = eval(this.calcVisor);
      this.calcVisor = String(resultado);
    } catch (e) {
      this.calcVisor = 'Erro';
      setTimeout(() => this.limparCalc(), 1500);
    }
  }

  usarValorCalculadora() {
    if (this.calcVisor && this.calcVisor !== 'Erro') {
      const valorNumerico = parseFloat(this.calcVisor);
      if (!isNaN(valorNumerico)) {
        this.novoItemPreco = parseFloat(valorNumerico.toFixed(2));
      }
    }
    this.fecharCalculadora();
  }
}