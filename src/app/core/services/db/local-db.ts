import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { ListaCompra, ItemCompra } from '../../models/compra.modal'; // Caminho e nome corrigidos

@Injectable({
  providedIn: 'root'
})
export class LocalDbService extends Dexie {
  listas!: Table<ListaCompra, string>;
  itens!: Table<ItemCompra, string>;

  constructor() {
    super('SmartListDB');
    
    this.version(1).stores({
      listas: 'id, user_id, finalizada',
      itens: 'id, lista_id'
    });
  }

  generateUUID(): string {
    return crypto.randomUUID();
  }
}