import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SECCIONES_CATALOGO } from '../../config/secciones.config';
import { ContenidoProducto, ContenidoSeccion } from '../../models/catalogo-contenido.model';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminContenidoService } from '../../services/admin-contenido.service';
import { CatalogoContenidoService } from '../../services/catalogo-contenido.service';

type TabAdmin = 'secciones' | 'productos';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AdminAuthService);
  private readonly adminApi = inject(AdminContenidoService);
  private readonly catalogo = inject(CatalogoContenidoService);
  private readonly router = inject(Router);

  readonly secciones = SECCIONES_CATALOGO;
  readonly autenticado = signal(false);
  readonly tab = signal<TabAdmin>('secciones');
  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  readonly pinInput = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly seccionSeleccionada = new FormControl('alternadores', { nonNullable: true });
  readonly descripcionSeccion = new FormControl('', { nonNullable: true });
  readonly codigoProducto = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly descripcionProducto = new FormControl('', { nonNullable: true });

  archivoSeccion: File | null = null;
  archivoProducto: File | null = null;
  previewSeccion: string | null = null;
  previewProducto: string | null = null;
  imagenActualSeccion: string | null = null;
  imagenActualProducto: string | null = null;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    if (this.auth.estaAutenticado()) {
      this.autenticado.set(true);
      void this.cargarDatosSeccion();
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  async ingresar(): Promise<void> {
    const pin = this.pinInput.value.trim();
    if (!pin) return;

    this.mensaje.set(null);
    try {
      const valido = await firstValueFrom(this.adminApi.verificarPin(pin));
      if (!valido) {
        this.mensaje.set({ tipo: 'error', texto: 'PIN incorrecto.' });
        return;
      }
      this.auth.guardarPin(pin);
      this.autenticado.set(true);
      await this.cargarDatosSeccion();
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    }
  }

  salir(): void {
    this.auth.cerrarSesion();
    this.autenticado.set(false);
    this.pinInput.reset();
  }

  cambiarTab(t: TabAdmin): void {
    this.tab.set(t);
    this.mensaje.set(null);
    if (t === 'secciones') {
      void this.cargarDatosSeccion();
    }
  }

  async onSeccionChange(): Promise<void> {
    await this.cargarDatosSeccion();
  }

  private async cargarDatosSeccion(): Promise<void> {
    const id = this.seccionSeleccionada.value;
    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const sec = contenido.secciones[id];
      this.descripcionSeccion.setValue(sec?.descripcion ?? '');
      this.imagenActualSeccion = sec?.imagen ?? null;
      this.previewSeccion = this.imagenActualSeccion;
      this.archivoSeccion = null;
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al cargar la sección.' });
    }
  }

  onArchivoSeccion(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.archivoSeccion = file;
    this.previewSeccion = URL.createObjectURL(file);
  }

  onArchivoProducto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.archivoProducto = file;
    this.previewProducto = URL.createObjectURL(file);
  }

  async buscarProducto(): Promise<void> {
    const codigo = this.codigoProducto.value.trim().toUpperCase();
    if (!codigo) return;

    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const prod = contenido.productos[codigo];
      this.descripcionProducto.setValue(prod?.descripcion ?? '');
      this.imagenActualProducto = prod?.imagen ?? null;
      this.previewProducto = this.imagenActualProducto;
      this.archivoProducto = null;
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al buscar el producto.' });
    }
  }

  async guardarSeccion(): Promise<void> {
    const id = this.seccionSeleccionada.value;
    this.guardando.set(true);
    this.mensaje.set(null);

    try {
      let imagenUrl = this.imagenActualSeccion;

      if (this.archivoSeccion) {
        imagenUrl = await firstValueFrom(
          this.adminApi.subirImagen('secciones', id, this.archivoSeccion),
        );
      }

      const datos: ContenidoSeccion = {
        descripcion: this.descripcionSeccion.value.trim(),
        imagen: imagenUrl ?? undefined,
      };

      await firstValueFrom(this.adminApi.guardarSeccion(id, datos));
      await this.catalogo.recargar();
      this.imagenActualSeccion = imagenUrl;
      this.archivoSeccion = null;
      this.mensaje.set({ tipo: 'ok', texto: '¡Sección guardada!' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo guardar la sección.' });
    } finally {
      this.guardando.set(false);
    }
  }

  async guardarProducto(): Promise<void> {
    const codigo = this.codigoProducto.value.trim().toUpperCase();
    if (!codigo) {
      this.mensaje.set({ tipo: 'error', texto: 'Ingrese el código interno.' });
      return;
    }

    this.guardando.set(true);
    this.mensaje.set(null);

    try {
      let imagenUrl = this.imagenActualProducto;

      if (this.archivoProducto) {
        imagenUrl = await firstValueFrom(
          this.adminApi.subirImagen('productos', codigo, this.archivoProducto),
        );
      }

      const datos: ContenidoProducto = {
        descripcion: this.descripcionProducto.value.trim(),
        imagen: imagenUrl ?? undefined,
      };

      await firstValueFrom(this.adminApi.guardarProducto(codigo, datos));
      await this.catalogo.recargar();
      this.imagenActualProducto = imagenUrl;
      this.archivoProducto = null;
      this.mensaje.set({ tipo: 'ok', texto: '¡Producto guardado!' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo guardar el producto.' });
    } finally {
      this.guardando.set(false);
    }
  }

  volverCatalogo(): void {
    void this.router.navigate(['/']);
  }
}
