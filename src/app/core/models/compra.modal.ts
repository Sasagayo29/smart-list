export interface ListaCompra {
  id?: string; // Opcional na criação, pois o celular pode gerar o UUID
  user_id: string;
  nome: string;
  orcamento: number;
  finalizada: boolean;
  created_at?: string;
}

export interface ItemCompra {
  id?: string;
  lista_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  created_at?: string;
}