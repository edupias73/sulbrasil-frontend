import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Produto } from '../models/produto.model';
import { environment } from '../../environments/environment';
import { CatalogoContenidoService } from './catalogo-contenido.service';

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly http = inject(HttpClient);
  // Injetamos o serviço que lê o JSON antigo
  private readonly catalogo = inject(CatalogoContenidoService);

  buscar(termo: string, categoria: string | null = null): Observable<Produto[]> {
    let params = new HttpParams()
      .set('q', termo)
      .set('page', '0')
      .set('size', '200'); 

    if (categoria) {
      params = params.set('categoria', categoria);
    }

    return this.http.get<{ content: Produto[] }>(environment.apiUrl, { params }).pipe(
      map(res => {
        // A MÁGICA AQUI: Para cada peça do MySQL, ele vai no JSON e resgata a foto!
        return res.content.map(peca => this.catalogo.enriquecer(peca));
      })
    );
  }
}