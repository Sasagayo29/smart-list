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
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  listaId: string = '';
  listaAtual: ListaCompra | undefined;
  itens: ItemCompra[] = [];
  totalLista: number = 0;
  
  // Controle de Busca
  termoBusca = '';

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
    this.cdr.detectChanges(); 
  }

  calcularTotal() {
    this.totalLista = this.itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0);
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }

  // 👇 Busca Inteligente: Ignora acentos e case sensitive
  get itensFiltrados() {
    if (!this.termoBusca) return this.itens;
    
    // Normaliza o termo de busca (tira acentos e deixa minúsculo)
    const termoLimpo = this.termoBusca
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return this.itens.filter(item => {
      // Normaliza o nome do produto salvo no banco
      const nomeLimpo = item.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
        
      return nomeLimpo.includes(termoLimpo);
    });
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
    this.cdr.detectChanges();
  }

  fecharModal() {
    this.isModalOpen = false;
    this.itemEmEdicaoId = null;
    this.novoItemNome = '';
    this.novoItemQtd = 1;
    this.novoItemPreco = null;
    this.cdr.detectChanges();
  }

  async salvarItem() {
    if (!this.novoItemNome || this.novoItemQtd < 1) return;

    // Usamos 'any' para driblar a tipagem estrita do modelo antigo
    const itemSalvar: any = {
      id: this.itemEmEdicaoId || this.localDb.generateUUID(),
      lista_id: this.listaId,
      nome: this.novoItemNome,
      quantidade: this.novoItemQtd,
      preco_unitario: this.novoItemPreco || 0,
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
  processarImagem(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isProcessandoImagem = true;
      this.cdr.detectChanges();
      
      // Simulação do tempo de processamento OCR/Leitura
      setTimeout(() => {
        this.isProcessandoImagem = false;
        this.abrirModal();
        this.novoItemNome = "Produto Escaneado";
        this.novoItemPreco = 15.90;
        this.cdr.detectChanges();
      }, 2000);
    }
  }

  async sincronizarNuvem() {
    this.isSincronizando = true;
    this.cdr.detectChanges(); 
    
    try {
      // 👇 1. Descobre quem é o usuário real logado na sessão do Supabase
      const { data: authData } = await this.supabaseService.supabaseClient.auth.getSession();
      const idUsuarioReal = authData.session?.user?.id;

      if (!idUsuarioReal) {
        alert('Você precisa estar logado na sua conta para sincronizar com a nuvem!');
        this.isSincronizando = false;
        return;
      }

      // 👇 2. Sincroniza a Lista substituindo o 'local' pelo ID verdadeiro
      if (this.listaAtual) {
        const listaParaNuvem = {
          id: this.listaAtual.id,
          nome: this.listaAtual.nome,
          orcamento: this.listaAtual.orcamento || 0,
          user_id: idUsuarioReal // ✨ A mágica acontece aqui!
        };
        await this.supabaseService.sincronizarListas([listaParaNuvem]);
      }

      // 3. Sincroniza os Itens (Filhos)
      const itensLocais = await this.localDb.itens.toArray();
      if (itensLocais.length === 0) {
        alert('A Lista foi salva na nuvem, mas ainda não há produtos nela.');
        this.isSincronizando = false;
        return;
      }
      
      const itensParaNuvem = itensLocais.map(item => {
        return {
          id: item.id,
          lista_id: item.lista_id, 
          nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario
        };
      });
      
      await this.supabaseService.sincronizarItens(itensParaNuvem);
      alert('Sincronização concluída com sucesso! ☁️');
      
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      alert(`Falha na nuvem: ${error.message || 'Erro no Supabase.'}`);
    } finally {
      this.isSincronizando = false;
      this.cdr.detectChanges(); 
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
      // new Function é mais seguro e aceito pelos bundlers como o Vercel
      const resultado = new Function('return ' + this.calcVisor)();
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