import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CatalogoContenido,
  ContenidoProducto,
  ContenidoSeccion,
} from '../models/catalogo-contenido.model';
import { AdminAuthService } from './admin-auth.service';

@Injectable({ providedIn: 'root' })
export class AdminContenidoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AdminAuthService);

  verificarPin(pin: string): Observable<boolean> {
    return this.http
      .post<{ valido: boolean }>(`${environment.adminApiUrl}/verificar-pin`, { pin })
      .pipe(map((r) => r.valido));
  }

  obtenerContenido(): Observable<CatalogoContenido> {
    return this.http.get<CatalogoContenido>(`${environment.adminApiUrl}/contenido`, {
      headers: this.headersAdmin(),
    });
  }

  guardarSeccion(seccionId: string, datos: ContenidoSeccion): Observable<void> {
    return this.http.patch<void>(
      `${environment.adminApiUrl}/secciones/${seccionId}`,
      datos,
      { headers: this.headersAdmin() },
    );
  }

  guardarProducto(codigoInterno: string, datos: ContenidoProducto): Observable<void> {
    return this.http.patch<void>(
      `${environment.adminApiUrl}/productos/${encodeURIComponent(codigoInterno)}`,
      datos,
      { headers: this.headersAdmin() },
    );
  }

  subirImagen(tipo: 'secciones' | 'productos', id: string, archivo: File): Observable<string> {
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('id', id);
    form.append('archivo', archivo);

    return this.http
      .post<{ url: string }>(`${environment.adminApiUrl}/upload`, form, {
        headers: this.headersAdminMultipart(),
      })
      .pipe(map((r) => r.url));
  }

  private headersAdmin(): HttpHeaders {
    return new HttpHeaders().set('X-Admin-Pin', this.auth.getPin() ?? '');
  }

  private headersAdminMultipart(): HttpHeaders {
    return new HttpHeaders().set('X-Admin-Pin', this.auth.getPin() ?? '');
  }
}
