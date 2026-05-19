import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Produto } from '../models/produto.model';
import { CatalogoContenidoService } from './catalogo-contenido.service';

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly contenido = inject(CatalogoContenidoService);

  constructor(private readonly http: HttpClient) {}

  buscar(termo: string, categoria?: string | null): Observable<Produto[]> {
    let params = new HttpParams().set('empresa', environment.empresa);

    if (termo.trim()) {
      params = params.set('q', termo.trim());
    }
    if (categoria) {
      params = params.set('categoria', categoria);
    }

    return this.http.get<Produto[]>(environment.apiUrl, { params }).pipe(
      map((lista) => lista.map((p) => this.contenido.enriquecer(this.normalizar(p)))),
    );
  }

  private normalizar(produto: Produto): Produto {
    return {
      ...produto,
      preco: Number(produto.preco),
      codigosCruzados: produto.codigosCruzados ?? [],
      aplicacoesVeiculo: produto.aplicacoesVeiculo ?? [],
    };
  }
}
