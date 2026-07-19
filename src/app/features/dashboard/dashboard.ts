import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalDbService } from '../../core/services/db/local-db';
import { ListaCompra } from '../../core/models/compra.modal';

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

  listas: ListaViewModel[] = [];

  // Controles do Modal
  isModalOpen = false;
  novaListaNome = '';
  novaListaOrcamento: number | null = null;

  async ngOnInit() {
    await this.carregarListas();
  }

  async carregarListas() {
    const listasBanco = await this.localDb.listas.toArray();
    const listasProcessadas: ListaViewModel[] = [];

    for (const lista of listasBanco) {
      // Usamos o "!" para garantir ao TypeScript que o id existe
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

    // Usamos o "!" para garantir ao TypeScript que a data existe
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
      // Preenchendo as propriedades exigidas pelo seu modelo:
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