export interface ContenidoSeccion {
  descripcion?: string;
  imagen?: string;
}

export interface ContenidoProducto {
  descripcion?: string;
  imagen?: string;
}

export interface CatalogoContenido {
  secciones: Record<string, ContenidoSeccion>;
  productos: Record<string, ContenidoProducto>;
}
