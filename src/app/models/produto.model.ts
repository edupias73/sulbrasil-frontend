export interface AplicacaoVeiculo {
  id?: number;
  montadora: string;
  veiculo: string;
  anoInicio?: number | null;
  anoFim?: number | null;
}

export interface CodigoCruzado {
  id?: number;
  marcaFabricante: string;
  codigo: string;
}

export interface Produto {
  id: number;
  codigoInterno: string;
  nomePeca: string;
  marcaPrincipal: string;
  preco: number;
  quantidadeEstoque: number;
  categoria?: string | null;
  descripcion?: string | null;
  urlImagen?: string | null;
  codigosCruzados: CodigoCruzado[];
  aplicacoesVeiculo: AplicacaoVeiculo[];
}

export interface ItemCarrito {
  produto: Produto;
  cantidad: number;
}
