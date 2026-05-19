import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CatalogoContenido,
  ContenidoProducto,
  ContenidoSeccion,
} from '../models/catalogo-contenido.model';
import { Produto } from '../models/produto.model';

const FALLBACK_URL = '/data/catalogo-contenido.json';

@Injectable({ providedIn: 'root' })
export class CatalogoContenidoService {
  private readonly http = inject(HttpClient);
  private readonly contenido = signal<CatalogoContenido>({ secciones: {}, productos: {} });
  private cargado = false;

  async cargar(): Promise<void> {
    if (this.cargado) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CatalogoContenido>(environment.catalogoContenidoUrl),
      );
      this.contenido.set(this.normalizar(data));
    } catch {
      try {
        const fallback = await firstValueFrom(this.http.get<CatalogoContenido>(FALLBACK_URL));
        this.contenido.set(this.normalizar(fallback));
      } catch {
        this.contenido.set({ secciones: {}, productos: {} });
      }
    }
    this.cargado = true;
  }

  recargar(): Promise<void> {
    this.cargado = false;
    return this.cargar();
  }

  private normalizar(data: CatalogoContenido): CatalogoContenido {
    return {
      secciones: data.secciones ?? {},
      productos: data.productos ?? {},
    };
  }

  obtenerSeccion(seccionId: string): ContenidoSeccion | undefined {
    return this.contenido().secciones[seccionId];
  }

  obtenerProducto(codigoInterno: string): ContenidoProducto | undefined {
    const clave = codigoInterno.trim().toUpperCase();
    return this.contenido().productos[clave] ?? this.contenido().productos[codigoInterno];
  }

  enriquecer(produto: Produto): Produto {
    const extra = this.obtenerProducto(produto.codigoInterno);
    return {
      ...produto,
      descripcion: extra?.descripcion ?? produto.descripcion,
      urlImagen: extra?.imagen ?? produto.urlImagen,
    };
  }

  imagenSeccion(seccionId: string): string | null {
    return this.obtenerSeccion(seccionId)?.imagen ?? null;
  }

  descripcionSeccion(seccionId: string): string | null {
    return this.obtenerSeccion(seccionId)?.descripcion ?? null;
  }
}
