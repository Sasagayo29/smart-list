import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ActivatedRoute, Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';
import { ListaCompra, ItemCompra } from '../../core/models/compra.modal';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase/supabase';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

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
  private http = inject(HttpClient);
  private supabaseService = inject(SupabaseService);
  private platformId = inject(PLATFORM_ID);

  isProcessandoImagem = false; 
  isSincronizando = false; // Controle de loading para o botão de nuvem

  listaId: string = '';
  listaAtual: ListaCompra | undefined;
  itens: ItemCompra[] = [];
  totalLista: number = 0;
  // Variável de Ordenação
  criterioOrdenacao = 'recentes';

  // Variáveis do Modal
  isModalOpen = false;
  novoItemNome = '';
  novoItemQtd = 1;
  novoItemPreco: number | null = null;
  itemEmEdicaoId: string | null = null; // 👇 Nova variável de controle

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.listaId = this.route.snapshot.paramMap.get('id') || '';
      
      if (this.listaId) {
        await this.carregarDados();
      } else {
        this.voltar();
      }
    }
  }

  async carregarDados() {
    this.listaAtual = await this.localDb.listas.get(this.listaId);
    this.itens = await this.localDb.itens.where('lista_id').equals(this.listaId).toArray();
    this.calcularTotal();
  }

  calcularTotal() {
    this.totalLista = this.itens.reduce((acc, item) => {
      return acc + (item.quantidade * (item.preco_unitario || 0));
    }, 0);
  }

  ordenarLista() {
    switch (this.criterioOrdenacao) {
      case 'nome':
        this.itens.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case 'maior-preco':
        this.itens.sort((a, b) => 
          (b.preco_unitario * b.quantidade) - (a.preco_unitario * a.quantidade)
        );
        break;
      case 'menor-preco':
        this.itens.sort((a, b) => 
          (a.preco_unitario * a.quantidade) - (b.preco_unitario * b.quantidade)
        );
        break;
      default:
        // Ordem original (como foi inserido no banco)
        this.carregarDados(); 
        break;
    }
  }

  // 👇 Função abrirModal atualizada para receber um item opcional
  abrirModal(item?: ItemCompra) {
    if (item) {
      // Modo Edição: preenche os dados com o item selecionado
      this.itemEmEdicaoId = item.id!;
      this.novoItemNome = item.nome;
      this.novoItemQtd = item.quantidade;
      this.novoItemPreco = item.preco_unitario;
    } else {
      // Modo Criação: limpa tudo
      this.itemEmEdicaoId = null;
      this.novoItemNome = '';
      this.novoItemQtd = 1;
      this.novoItemPreco = null;
    }
    this.isModalOpen = true;
  }

  fecharModal() {
    this.isModalOpen = false;
    this.itemEmEdicaoId = null;
    this.novoItemNome = '';
    this.novoItemQtd = 1;
    this.novoItemPreco = null;
  }

  // 👇 Função salvarItem atualizada para decidir entre Add ou Update
  async salvarItem() {
    if (!this.novoItemNome) return;

    if (this.itemEmEdicaoId) {
      // Atualiza o item existente no Dexie/IndexedDB
      await this.localDb.itens.update(this.itemEmEdicaoId, {
        nome: this.novoItemNome,
        quantidade: this.novoItemQtd,
        preco_unitario: this.novoItemPreco || 0
      });
    } else {
      // Cria um item novo
      const novoItem: ItemCompra = {
        id: this.localDb.generateUUID(),
        lista_id: this.listaId,
        nome: this.novoItemNome,
        quantidade: this.novoItemQtd,
        preco_unitario: this.novoItemPreco || 0,
        created_at: new Date().toISOString()
      };
      await this.localDb.itens.add(novoItem);
    }
    
    this.fecharModal();
    await this.carregarDados(); 
  }

  async abrirCamera() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear
      });

      if (image.base64String) {
        this.isProcessandoImagem = true; 
        
        try {
          const payload = { image_base64: image.base64String };
          const resposta = await firstValueFrom(
            this.http.post<any>('http://127.0.0.1:8000/extrair-etiqueta', payload)
          );

          this.novoItemNome = resposta.nome;
          this.novoItemPreco = resposta.preco;
          this.novoItemQtd = 1;
          
          this.abrirModal();

        } catch (apiError) {
          console.error('Erro na API:', apiError);
          alert('Falha ao processar a etiqueta com a IA. O servidor Python está rodando?');
        } finally {
          this.isProcessandoImagem = false; 
        }
      }
      
    } catch (error) {
      console.error('Câmera fechada ou sem permissão', error);
    }
  }

  async excluirItem(itemId: string) {
    // Pede uma confirmação simples nativa do navegador/celular
    const confirmar = confirm('Tem certeza que deseja remover este produto da lista?');
    
    if (confirmar) {
      await this.localDb.itens.delete(itemId);
      await this.carregarDados(); // Recarrega a tela para recalcular o total da compra automaticamente
    }
  }

  async sincronizarNuvem() {
    this.isSincronizando = true;
    
    try {
      // Usa a instância localDb que já estava injetada para buscar os itens
      const itensLocais = await this.localDb.itens.toArray();
      
      if (itensLocais.length === 0) {
        alert('A lista está vazia, não há nada para sincronizar.');
        this.isSincronizando = false;
        return;
      }

      await this.supabaseService.sincronizarItens(itensLocais);
      
      alert('Sincronização concluída com sucesso! Seus dados estão na nuvem. ☁️');
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Falha ao sincronizar. Verifique sua conexão e tente novamente.');
    } finally {
      this.isSincronizando = false;
    }
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }
}